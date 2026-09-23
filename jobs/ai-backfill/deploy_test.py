import unittest
from deploy import normalize_database_url


class DatabaseURLTests(unittest.TestCase):
    def test_raw_credential_characters_are_encoded(self):
        self.assertEqual(
            normalize_database_url('postgresql://dbuser:p[a]ss!@10.0.0.1:5432/eic-prod'),
            'postgresql://dbuser:p%5Ba%5Dss%21@10.0.0.1:5432/eic-prod')

    def test_encoding_is_idempotent_and_retains_options(self):
        uri = 'postgres://a%40b:p%25%40%3A@host/db?sslmode=require'
        self.assertEqual(normalize_database_url(uri), uri)

    def test_ipv6_and_passwordless_uri(self):
        self.assertEqual(normalize_database_url('postgres://u@[::1]:5432/db'),
                         'postgres://u@[::1]:5432/db')


if __name__ == '__main__':
    unittest.main()
