/* eslint-disable no-undef */
const request = require('supertest');
const express = require('express');
const { update } = require('../src/controllers/profiles/adress_controller'); // Adjust the path accordingly
const Profile = require('../src/models/profile'); // Adjust the path accordingly
const _ = require('lodash');
const recursiveKeyPrefixTransform = require('../src/helper/recursive_key_prefix_transform'); // Adjust the path accordingly

jest.mock('../src/models/profile');
jest.mock('../src/helper/recursive_key_prefix_transform', () => ({
  recursiveKeyPrefixTransform: jest.fn((data, prefix) => ({ ...data, prefix })),
}));

const app = express();
app.use(express.json());
app.put('/api/users/profiles/address', update);

describe('PUT /api/users/profiles/address', () => {
  let profile;

  beforeEach(() => {
    profile = {
      _id: '507f191e810c19729de860ea',
      country: 'USA',
      city: 'New York',
      street: '5th Avenue',
      conservative: 'Republican',
      social_media_links: { platform_id: 'some_platform_id' },
      toObject: jest.fn().mockReturnValue({
        _id: '507f191e810c19729de860ea',
        country: 'USA',
        city: 'New York',
        street: '5th Avenue',
        conservative: 'Republican',
      }),
    };
  });

  it('should update the profile with new address details', async () => {
    const updatedProfile = { ...profile, country: 'Canada' };
    Profile.findByIdAndUpdate.mockResolvedValue(updatedProfile);

    const res = await request(app)
      .put('/users/profiles/address')
      .send({ country: 'Canada' })
      .set('Authorization', 'Bearer some-valid-token'); // Mock authentication

    // expect(res.statusCode).toBe(200);
    expect(res.body.status).('failure');
    // expect(res.body.message).toBe('Updated successfully'); // Assuming tr($.updated_successfully) translates to this
    // expect(res.body.profile.country).toBe('Canada');
  });

//   it('should handle unset fields correctly', async () => {
//     const updatedProfile = { ...profile, street: undefined };
//     Profile.findByIdAndUpdate.mockResolvedValue(updatedProfile);

//     const res = await request(app)
//       .put('/api/users/profiles/address')
//       .send({ street: undefined })
//       .set('Authorization', 'Bearer some-valid-token'); // Mock authentication

//     expect(res.statusCode).toBe(200);
//     expect(res.body.status).toBe('success');
//     expect(res.body.profile.street).toBeUndefined();
//   });

//   it('should handle missing fields correctly', async () => {
//     Profile.findByIdAndUpdate.mockResolvedValue(profile);

//     const res = await request(app)
//       .put('/api/users/profiles/address')
//       .send({ someOtherField: 'value' })
//       .set('Authorization', 'Bearer some-valid-token'); // Mock authentication

//     expect(res.statusCode).toBe(200);
//     expect(res.body.status).toBe('success');
//     expect(res.body.profile.country).toBe('USA'); // Original value should be preserved
//   });

//   it('should return 400 if no fields are provided', async () => {
//     const res = await request(app)
//       .put('/api/users/profiles/address')
//       .send({})
//       .set('Authorization', 'Bearer some-valid-token'); // Mock authentication

//     expect(res.statusCode).toBe(400); // Assuming 400 is returned for invalid request
//     expect(res.body.status).toBe('fail');
//     expect(res.body.message).toBe('No fields to update'); // Adjust based on your actual implementation
//   });

//   it('should return 404 if profile is not found', async () => {
//     Profile.findByIdAndUpdate.mockResolvedValue(null);

//     const res = await request(app)
//       .put('/api/users/profiles/address')
//       .send({ country: 'Canada' })
//       .set('Authorization', 'Bearer some-valid-token'); // Mock authentication

//     expect(res.statusCode).toBe(404);
//     expect(res.body.status).toBe('fail');
//     expect(res.body.message).toBe('Profile not found'); // Adjust based on your actual implementation
//   });
});
