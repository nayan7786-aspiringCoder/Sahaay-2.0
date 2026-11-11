"""
Sahaay 2.0 - Automated Backend & REST API Verification Tests
Tests all endpoints and HTTP methods: GET, POST, PUT, DELETE
"""

import unittest
from app import app
from database import init_db


class SahaayApiTestCase(unittest.TestCase):
    def setUp(self):
        self.app = app
        self.client = self.app.test_client()
        with self.app.app_context():
            init_db()

    def test_01_index_page(self):
        """Test GET / serves HTML page."""
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'Sahaay 2.0', response.data)

    def test_02_healthcheck(self):
        """Test GET /health returns 200 OK."""
        response = self.client.get('/health')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json['success'] if 'success' in response.json else True)

    def test_03_get_helpers_list(self):
        """Test HTTP GET /api/helpers."""
        response = self.client.get('/api/helpers')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json['success'])
        self.assertGreater(response.json['count'], 0)

    def test_04_create_helper_post(self):
        """Test HTTP POST /api/helpers (Providing Service)."""
        payload = {
            "name": "Kavita Rao",
            "phone": "9811199999",
            "location": "Indiranagar, Sector 14",
            "skills": ["Cooking", "Cleaning House"],
            "timings": "Morning (07:00 AM - 11:00 AM)",
            "experience_years": 4,
            "hourly_rate": 180,
            "bio": "Expert in North Indian cuisines and thorough dusting.",
            "is_emergency": 0
        }
        response = self.client.post('/api/helpers', json=payload)
        self.assertEqual(response.status_code, 201)
        data = response.json['data']
        self.assertEqual(data['name'], "Kavita Rao")
        self.assertIn("Cooking", data['skills'])

    def test_05_update_helper_put(self):
        """Test HTTP PUT /api/helpers/<id>."""
        # Update helper #1 availability
        response = self.client.put('/api/helpers/1', json={"availability_status": "Busy"})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json['success'])

    def test_06_delete_helper(self):
        """Test HTTP DELETE /api/helpers/<id>."""
        # Create a temporary helper to delete
        res = self.client.post('/api/helpers', json={
            "name": "Temp Helper",
            "phone": "9000000000",
            "location": "Temp Location",
            "skills": ["General Help"]
        })
        new_id = res.json['data']['id']

        # Delete it
        del_res = self.client.delete(f'/api/helpers/{new_id}')
        self.assertEqual(del_res.status_code, 200)
        self.assertTrue(del_res.json['success'])

    def test_07_emergency_services(self):
        """Test HTTP GET /api/emergency."""
        response = self.client.get('/api/emergency')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json['success'])
        self.assertGreater(response.json['count'], 0)

    def test_08_create_and_get_bookings(self):
        """Test HTTP POST and GET /api/bookings."""
        booking_payload = {
            "helper_id": 1,
            "customer_name": "Rohan Gupta",
            "customer_phone": "9876541230",
            "customer_address": "Flat 303, Oakwood Heights",
            "service_needed": "Cleaning House",
            "booking_date": "2026-11-20",
            "booking_time": "08:30"
        }
        res_post = self.client.post('/api/bookings', json=booking_payload)
        self.assertEqual(res_post.status_code, 201)

        res_get = self.client.get('/api/bookings')
        self.assertEqual(res_get.status_code, 200)
        self.assertGreater(res_get.json['count'], 0)

    def test_09_chat_feature(self):
        """Test HTTP POST and GET /api/chat."""
        msg_payload = {
            "helper_id": 1,
            "sender": "customer",
            "text": "Hello, can we reschedule the time to 9 AM?"
        }
        res_post = self.client.post('/api/chat', json=msg_payload)
        self.assertEqual(res_post.status_code, 201)

        res_get = self.client.get('/api/chat/1')
        self.assertEqual(res_get.status_code, 200)
        self.assertGreater(len(res_get.json['data']), 0)


if __name__ == '__main__':
    unittest.main()
