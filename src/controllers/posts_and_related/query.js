const mongoose = require('mongoose');
const $ = require('../../locales/keys');
const tr = require('../../helper/translate');

exports.getAllDocuments =
  ({ Model, nameFieldInResponse }) =>
  async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;
    const userId = req.params.id || req.user.id;
    const retPost = req.query.post === 'true';
    const retCompany = req.query.company === 'true';
    const retUser = req.query.user === 'true';
    const retPublisher = req.query.publisher === 'true';

    const match = req.match || {
      user_id: new mongoose.Types.ObjectId(userId),
      deleted_at: { $exists: false },
      blocked: { $exists: false },
    };

    const pipeline = [
      {
        $match: match,
      },
      {
        $lookup: {
          from: 'posts',
          localField: 'post_id',
          foreignField: '_id',
          as: 'post',
        },
      },
      {
        $unwind: '$post',
      },
      {
        $match: {
          'post.deleted_at': { $exists: false },
          'post.blocked': { $exists: false },
        },
      },
      {
        $lookup: {
          from: 'companies',
          localField: 'post.company_id',
          foreignField: '_id',
          as: 'company',
        },
      },
      {
        $unwind: {
          path: '$company',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'company.founder._id',
          foreignField: '_id',
          as: 'founder',
        },
      },
      {
        $unwind: {
          path: '$founder',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'post.publisher_id',
          foreignField: '_id',
          as: 'publisher',
        },
      },

      {
        $unwind: '$publisher',
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'likes',
          localField: 'post._id',
          foreignField: 'post_id',
          as: 'like',
        },
      },
      {
        $lookup: {
          from: 'savedposts',
          localField: 'post._id',
          foreignField: 'post_id',
          as: 'savedposts',
        },
      },
      {
        $match: {
          $or: [
            {
              $and: [
                { 'publisher.deleted_at': { $exists: false } },
                { 'publisher.blocked': { $exists: false } },
                { 'post.deleted_at': { $exists: false } },
                { 'post.blocked': { $exists: false } },
                { 'post.company_id': { $exists: false } }, // Post not for company
              ],
            },
            {
              $and: [
                { 'post.deleted_at': { $exists: false } },
                { 'post.blocked': { $exists: false } },
                { 'company.deleted_at': { $exists: false } },
                { 'company.blocked': { $exists: false } },
                { 'founder.deleted_at': { $exists: false } },
                { 'founder.blocked': { $exists: false } },
                { 'post.company_id': { $exists: true } },
              ],
            },
          ],
        },
      },
      {
        $facet: {
          metadata: [
            { $count: 'total_count' },
            {
              $addFields: {
                current_page: page,
                limit: limit,
                number_of_pages: { $ceil: { $divide: ['$total_count', limit] } },
              },
            },
          ],
          [nameFieldInResponse || Model.modelName]: [
            { $sort: { created_at: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                text: 1,
                created_at: 1,
                updated_at: 1,

                post_id: {
                  $cond: {
                    if: retPost,
                    then: {
                      _id: '$post._id',
                      text: '$post.text',
                      images: '$post.images',
                      topics: '$post.topics',
                      like: { $gt: [{ $size: { $ifNull: ['$like', []] } }, 0] },
                      saved_post: { $gt: [{ $size: { $ifNull: ['$savedposts', []] } }, 0] },
                      likes_count: '$post.likes_count',
                      comments_count: '$post.comments_count',
                      created_at: '$post.created_at',
                      updated_at: '$post.updated_at',
                      publisher: {
                        $cond: {
                          if: retPublisher,
                          then: {
                            _id: '$publisher._id',
                            username: '$publisher.username',
                            profile_image: '$publisher.profile_image',
                            background_image: '$publisher.background_image',
                          },
                          else: '$$REMOVE',
                        },
                      },
                      company_id: {
                        $cond: {
                          if: retCompany && '$company',
                          then: {
                            _id: '$company._id',
                            name: '$company.name',
                            industry: '$company.industry',
                            website: '$company.website',
                            image: '$company.image',
                            cover_image: '$company.cover_image',
                          },
                          else: '$company._id',
                        },
                      },
                    },
                    else: '$post._id',
                  },
                },

                user_id: {
                  $cond: {
                    if: retUser,
                    then: {
                      _id: '$user._id',
                      username: '$user.username',
                      profile_image: '$user.profile_image',
                      background_image: '$user.background_image',
                    },
                    else: '$$REMOVE',
                  },
                },
              },
            },
          ],
        },
      },
      {
        $unwind: '$metadata',
      },
    ];

    const aggregationResult = await Model.aggregate(pipeline);

    const metadata = aggregationResult.length > 0 ? aggregationResult[0].metadata : {};
    const documents =
      aggregationResult.length > 0
        ? aggregationResult[0][nameFieldInResponse || Model.modelName]
        : [];

    const response = {
      status: 'success',
      message: tr($.retrieved_successfully),
      total_count: metadata.total_count || 0,
      count: documents.length,
      pagination: {
        current_page: metadata.current_page,
        limit: metadata.limit,
        number_of_pages: metadata.number_of_pages,
      },
      [nameFieldInResponse || Model.modelName.toLowerCase()]: documents,
    };

    if (skip + limit < metadata.total_count) {
      response.pagination.next = page + 1;
    }
    if (skip > 0) {
      response.pagination.prev = page - 1;
    }

    res.status(200).json(response);
  };
