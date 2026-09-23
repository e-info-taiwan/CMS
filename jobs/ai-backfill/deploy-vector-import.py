#!/usr/bin/env python3
"""Prepare the manual CLIP import job in read-only check mode; never execute it."""
import argparse
import json
from deploy import PROJECT, REGION, SA, gcloud


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--image', required=True)
    args = parser.parse_args()
    prefix = f'asia-east1-docker.pkg.dev/{PROJECT}/cloud-run-source-deploy/eic-photo-vector-import@sha256:'
    if not args.image.startswith(prefix):
        parser.error('Use an immutable e-info vector-import image digest')
    source = json.loads(gcloud('run', 'jobs', 'describe', 'photo-vector-backfill-lab',
                               '--region=us-central1', '--format=json'))
    entries = source['spec']['template']['spec']['template']['spec']['containers'][0]['env']
    user = next(entry['value'] for entry in entries if entry['name'] == 'DB_USER')
    ref = next(entry['valueFrom']['secretKeyRef'] for entry in entries if entry['name'] == 'DB_PASSWORD')
    if ref['name'] != 'photo-vector-lab-db-password':
        raise RuntimeError('Unexpected lab password secret')
    versions = json.loads(gcloud('secrets', 'versions', 'list', ref['name'],
                                '--filter=state:ENABLED', '--format=json'))
    version = max(int(item['name'].split('/')[-1]) for item in versions)
    gcloud('secrets', 'add-iam-policy-binding', ref['name'], '--member=serviceAccount:'+SA,
           '--role=roles/secretmanager.secretAccessor', '--format=none')
    values = {'BACKFILL_MODE':'check', 'BACKFILL_EXPECTED_DATABASE':'eic-prod',
              'BACKFILL_MAX_ITEMS':'200000', 'BACKFILL_BATCH_SIZE':'250',
              'BACKFILL_MAX_SECONDS':'18000', 'LAB_DB_USER':user,
              'LAB_DB_HOST':f'/cloudsql/{PROJECT}:us-central1:einfo-dev'}
    name = 'eic-photo-vector-import-prod'
    exists = gcloud('run', 'jobs', 'describe', name, '--region='+REGION, '--format=json', optional=True)
    action = 'create' if exists is None else 'update'
    gcloud('run', 'jobs', action, name, '--region='+REGION, '--image='+args.image,
           '--service-account='+SA, '--cpu=1', '--memory=1Gi', '--tasks=1', '--parallelism=1',
           '--task-timeout=6h', '--max-retries=0', '--network=default', '--subnet=default',
           '--vpc-egress=private-ranges-only', '--set-cloudsql-instances='+PROJECT+':us-central1:einfo-dev',
           '--set-env-vars='+','.join(key+'='+value for key, value in values.items()),
           '--set-secrets=DATABASE_URL=eic-ai-backfill-prod-database-url:2,LAB_DB_PASSWORD='+ref['name']+':'+str(version),
           '--labels=purpose=ai-backfill,environment=prod', '--format=none')
    print(json.dumps({'job':name, 'image':args.image, 'mode':'check', 'executed':False}))


if __name__ == '__main__':
    main()
