#!/usr/bin/env python3
"""Create/update manual jobs in check mode. Never starts an execution or migration."""
import argparse
import json
import subprocess
from urllib.parse import quote, unquote, urlsplit, urlunsplit

PROJECT = 'mimetic-sweep-456508-k4'
REGION = 'asia-east1'
ACCOUNT = 'eic-ai-backfill'
SA = f'{ACCOUNT}@{PROJECT}.iam.gserviceaccount.com'
SECRET = 'eic-ai-backfill-prod-database-url'
BUCKET = 'statics-e-info-prod'


def normalize_database_url(dsn):
    """Encode credentials so Node, Prisma, and Go accept the same connection URI."""
    url = urlsplit(dsn)
    if url.scheme not in ('postgres', 'postgresql') or not url.hostname or not url.username:
        raise ValueError('Invalid PostgreSQL connection URI')
    user = quote(unquote(url.username), safe='')
    password = ':' + quote(unquote(url.password), safe='') if url.password is not None else ''
    host = '[' + url.hostname + ']' if ':' in url.hostname else url.hostname
    port = ':' + str(url.port) if url.port else ''
    return urlunsplit((url.scheme, user + password + '@' + host + port, url.path, url.query, url.fragment))


def gcloud(*args, data=None, optional=False):
    proc = subprocess.run(['gcloud', *args, '--project='+PROJECT, '--quiet'],
                          input=data, text=True, capture_output=True)
    if proc.returncode:
        if optional and any(message in proc.stderr for message in (
                'NOT_FOUND', 'does not exist', 'Cannot find job [')):
            return None
        # Never include command stdin or captured service environment in errors.
        raise RuntimeError('gcloud failed: ' + ' '.join(args[:3]) + '\n' + proc.stderr)
    return proc.stdout


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--tag-image', required=True)
    parser.add_argument('--photo-image', required=True)
    args = parser.parse_args()
    prefix = f'asia-east1-docker.pkg.dev/{PROJECT}/cloud-run-source-deploy/'
    for image in [args.tag_image, args.photo_image]:
        if not image.startswith(prefix) or '@sha256:' not in image:
            parser.error('Both images must be immutable digests in the e-info Artifact Registry')

    if gcloud('iam', 'service-accounts', 'describe', SA, '--format=json', optional=True) is None:
        gcloud('iam', 'service-accounts', 'create', ACCOUNT, '--display-name=EIC AI backfill jobs')
    for role in ['roles/aiplatform.user', 'roles/serviceusage.serviceUsageConsumer', 'roles/cloudsql.client']:
        gcloud('projects', 'add-iam-policy-binding', PROJECT, '--member=serviceAccount:'+SA,
               '--role='+role, '--condition=None', '--format=none')
    gcloud('storage', 'buckets', 'add-iam-policy-binding', 'gs://'+BUCKET,
           '--member=serviceAccount:'+SA, '--role=roles/storage.objectViewer', '--format=none')

    existing = gcloud('secrets', 'describe', SECRET, '--format=json', optional=True)
    if existing is None:
        gcloud('secrets', 'create', SECRET, '--replication-policy=automatic', '--format=none')
    versions = json.loads(gcloud('secrets', 'versions', 'list', SECRET,
                                 '--filter=state:ENABLED', '--format=json'))
    if not versions:
        service = json.loads(gcloud('run', 'services', 'describe', 'eic-info-cms-prod',
                                    '--region='+REGION, '--format=json'))
        entry = next(v for v in service['spec']['template']['spec']['containers'][0]['env'] if v['name']=='DATABASE_URL')
        if 'value' in entry:
            dsn = entry['value']
        else:
            ref = entry['valueFrom']['secretKeyRef']
            dsn = gcloud('secrets', 'versions', 'access', ref['key'], '--secret='+ref['name'])
        url = urlsplit(dsn)
        if url.path != '/eic-prod' or url.hostname != '10.48.32.3':
            raise RuntimeError('CMS production database identity changed; verify it before preparing the jobs')
        # Secret travels only through memory and stdin, never argv, a file, or output.
        gcloud('secrets', 'versions', 'add', SECRET, '--data-file=-', '--format=none',
               data=normalize_database_url(dsn))
        del dsn, service, entry
        versions = json.loads(gcloud('secrets', 'versions', 'list', SECRET,
                                     '--filter=state:ENABLED', '--format=json'))
    version = max(int(v['name'].split('/')[-1]) for v in versions)
    dsn = gcloud('secrets', 'versions', 'access', str(version), '--secret='+SECRET)
    normalized = normalize_database_url(dsn)
    if normalized != dsn:
        gcloud('secrets', 'versions', 'add', SECRET, '--data-file=-', '--format=none', data=normalized)
        versions = json.loads(gcloud('secrets', 'versions', 'list', SECRET,
                                     '--filter=state:ENABLED', '--format=json'))
        version = max(int(v['name'].split('/')[-1]) for v in versions)
    del dsn, normalized
    gcloud('secrets', 'add-iam-policy-binding', SECRET, '--member=serviceAccount:'+SA,
           '--role=roles/secretmanager.secretAccessor', '--format=none')

    common_env = {'BACKFILL_MODE':'check', 'BACKFILL_EXPECTED_DATABASE':'eic-prod',
                  'BACKFILL_MAX_ITEMS':'50', 'BACKFILL_BATCH_SIZE':'25',
                  'BACKFILL_MAX_SECONDS':'3000', 'BACKFILL_ATTEMPTS':'3'}
    definitions = [
        ('eic-tag-embedding-backfill-prod', args.tag_image, '1', '512Mi', {
            'TAG_VERTEX_PROJECT':PROJECT, 'TAG_VERTEX_LOCATION':REGION,
            'TAG_VERTEX_EMBEDDING_MODEL':'gemini-embedding-001',
            'BACKFILL_REQUEST_TIMEOUT_MS':'45000'}),
        ('eic-photo-ai-backfill-prod', args.photo_image, '2', '4Gi', {
            'AI_BACKFILL_JOB':'photos', 'IMAGE_BUCKET':BUCKET,
            'ENABLE_IMAGE_VECTOR':'true', 'ENABLE_IMAGE_LABEL':'true',
            'TORCH_NUM_THREADS':'1', 'VECTOR_IMAGE_MAX_SIZE':'384',
            'ENABLE_WATERMARK':'false', 'IMAGE_LABEL_MIN_SCORE':'0.75',
            'IMAGE_LABEL_MAX_RESULTS':'10', 'MAX_SOURCE_PIXELS':'60000000'}),
    ]
    for name, image, cpu, memory, extra in definitions:
        exists = gcloud('run','jobs','describe',name,'--region='+REGION,'--format=json',optional=True)
        action = 'create' if exists is None else 'update'
        env = common_env | extra
        gcloud('run', 'jobs', action, name, '--region='+REGION,
               '--image='+image, '--service-account='+SA,
               '--tasks=1', '--parallelism=1', '--task-timeout=3600s', '--max-retries=0',
               '--cpu='+cpu, '--memory='+memory,
               '--network=default', '--subnet=default', '--vpc-egress=private-ranges-only',
               '--set-env-vars='+','.join(k+'='+v for k,v in env.items()),
               '--set-secrets=DATABASE_URL='+SECRET+':'+str(version),
               '--labels=purpose=ai-backfill,environment=prod', '--format=none')
        print(json.dumps({'job':name,'image':image,'mode':'check','executed':False}))


if __name__ == '__main__':
    main()
