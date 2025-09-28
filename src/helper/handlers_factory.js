const ApiError = require('../utils/api_error'); //
const ApiFeatures = require('../utils/api_features');
const _ = require('lodash');
const $ = require('../locales/keys');
const tr = require('../helper/translate');
const val = require('../helper/custon_validation');
const extractQueryParameters = require('./extract_query_parameters');
const { getSingularFromList, convertToSnakeCase } = require('./fix_key_model_name');
const deleteFileOrFiles = require('./delete_files');
const getAllFields = require('../helper/get_all_field_schema');
const buildFilterWithMerge = require('../helper/build_filter_with_merge');
const mongoose = require('mongoose');
exports.createOne =
  ({ Model, fields, fieldsToOmitFromResponse = ['__v'], callback = null }) =>
  async (req, res) => {
    // Pick specified fields from the request body to create the new document

    const fieldsToCreateNewItem = _.pick(req.body, fields);
    // Create a new document using the specified fields
    const newDoc = await Model.create(fieldsToCreateNewItem);
    for (let i = 0; (req.saveImages || []).length > i; i++) await req.saveImages[i]();

    // Sanitize the document by omitting specified fields
    const sanitizedDoc = _.omit(newDoc.toObject(), fieldsToOmitFromResponse);

    let responseData = {
      status: 'success',
      message: `${tr($.created_successfully)}`,
      [getSingularFromList(Model.modelName)]: sanitizedDoc,
    };

    if (callback) responseData = await callback(responseData);

    res.status(201).json(responseData);

    return newDoc;
  };

exports.getOne =
  ({ Model, populationOpt, fieldsToOmitFromResponse = ['__v'], callback = null }) =>
  async (req, res, next) => {
    let query = Model.findById(req.params.id);

    if (populationOpt && Array.isArray(populationOpt)) {
      populationOpt.forEach(async option => {
        query = query.populate(option);
      });
    } else if (req.query.populate) {
      const populate = req.query.populate.split(',');
      const fieldsEndingWithId = getAllFields(Model.schema).filter(
        path => path.endsWith('_id') && path !== '_id',
      );
      const intersection = fieldsEndingWithId.filter(value => populate.includes(value));
      intersection.forEach(async option => {
        let selectedOption;
        if (req.query.select) selectedOption = req.query.select.split(',').join(' ');
        query = query.populate({
          path: option,
          select: selectedOption ? selectedOption : '-__v',
        });
      });
    }

    // Execute query to find the document
    const document = await query;
    // If no document is found, return a 404 error
    if (!document) {
      return next(
        new ApiError(
          [$.no_found, getSingularFromList(Model.modelName), $.for_this_id, req.params.id],
          404,
          {
            merge: true,
          },
        ),
      );
    }
    // Sanitize the retrieved document by omitting specified fields
    const sanitizedDoc = _.omit(document.toObject(), fieldsToOmitFromResponse);

    let responseData = {
      status: 'success',
      message: tr($.retrieved_successfully),
      [getSingularFromList(Model.modelName)]: sanitizedDoc,
    };

    if (callback) responseData = await callback(responseData);

    res.status(200).json(responseData);
  };

exports.getAll =
  ({
    Model,
    fieldsToOmitFromResponse,
    fieldsToSearch,
    filterDeveloper,
    developerProjection = null,
    developerSort = null,
    callback = null,
    populateDeveloper,
  }) =>
  async (req, res, next) => {
    const allFields = getAllFields(Model.schema);

    for (let i = 0; i < allFields.length; i++) {
      if (req.query[allFields[i]] && allFields[i].endsWith('_id')) {
        const path = Model.schema.paths[allFields[i]];
        if (path.instance === 'ObjectId' && !val.validateObjectId(req.query[allFields[i]])) {
          return next(
            new ApiError([$.field, allFields[i], $.is_not_a_valid_objectId], 400, { merge: true }),
          );
        }
      }
    }

    const { queryFilters, operationalParameters, orConditionsToSearch } = extractQueryParameters(
      allFields,
      req.query,
      fieldsToSearch,
    );

    const finalFilter = buildFilterWithMerge(queryFilters, Model, filterDeveloper);

    const documentsCounts = await Model.countDocuments({ ...finalFilter, ...orConditionsToSearch });
    // Create an API features object to handle advanced queries
    const apiFeatures = new ApiFeatures(Model, finalFilter, operationalParameters)
      .filter(developerProjection)
      .sort(developerSort)
      .limitFields()
      .search({ conditions: orConditionsToSearch })
      .populate(populateDeveloper)
      .paginate(documentsCounts);

    // Execute the query with applied features
    const { model, paginationResult } = apiFeatures;

    const documents = await model;
    // Sanitize each retrieved document
    const sanitizedDocuments = documents.map(document => {
      const sanitizedDoc = _.omit(document.toObject(), fieldsToOmitFromResponse);
      return sanitizedDoc;
    });

    let responseData = {
      status: 'success',
      message: tr($.retrieved_successfully),
      total_count: documentsCounts,
      count: sanitizedDocuments.length,
      ...(documentsCounts > 0 ? { pagination: paginationResult } : {}),
      [convertToSnakeCase(Model.modelName)]: sanitizedDocuments,
    };

    if (callback) responseData = await callback(responseData);

    res.status(200).json(responseData);
  };

exports.updateOne =
  ({ Model, fields, populationOpt, callback = null, fieldsToOmitFromResponse = ['__v'] }) =>
  async (req, res, next) => {
    const docForCheckIsDeleted = await Model.findById(req.params.id);
    if (!docForCheckIsDeleted || docForCheckIsDeleted.deleted_at) {
      return next(
        new ApiError(
          [$.no_found, getSingularFromList(Model.modelName), $.for_this_id, req.params.id],
          404,
          { merge: true },
        ),
      );
    }

    if (docForCheckIsDeleted.blocked) {
      return next(
        new ApiError([getSingularFromList(Model.modelName), $.has_been_blocked], 403, {
          merge: true,
        }),
      );
    }

    // Extract fields to update from the request body
    const fieldsToUpdate = _.pick(req.body, fields);

    // Separate fields to set and unset
    const setFields = _.pickBy(fieldsToUpdate, value => value !== undefined);
    const unsetFields = _.pickBy(fieldsToUpdate, value => value == undefined);
    // Prepare the update objectx`
    const update = {};
    if (!_.isEmpty(setFields)) {
      update.$set = setFields;
    }
    if (!_.isEmpty(unsetFields)) {
      update.$unset = _.mapValues(unsetFields, () => '');
    }

    // Update the document and retrieve the updated document
    let query = Model.findByIdAndUpdate(req.params.id, update, {
      new: false,
      runValidators: true,
    });

    if (populationOpt && Array.isArray(populationOpt)) {
      populationOpt.forEach(async option => {
        query = query.populate(option);
      });
    } else if (req.query.populate) {
      const populate = req.query.populate.split(',');
      const fieldsEndingWithId = getAllFields(Model.schema).filter(
        path => path.endsWith('_id') && path !== '_id',
      );
      const intersection = fieldsEndingWithId.filter(value => populate.includes(value));
      intersection.forEach(async option => {
        let selectedOption;
        if (req.query.select) selectedOption = req.query.select.split(',').join(' ');
        query = query.populate({
          path: option,
          select: selectedOption ? selectedOption : '-__v',
        });
      });
    }
    const updatedDocument = await query;

    // If no document is found, return a 404 error
    if (!updatedDocument) {
      return next(
        new ApiError(
          [$.no_found, getSingularFromList(Model.modelName), $.for_this_id, req.params.id],

          404,
          { merge: true },
        ),
      );
    }

    const oldDoc = updatedDocument.toObject();

    for (let key in req.body) {
      //? Just for safety
      if (fields.includes(key)) {
        if (req.removeImages && req.removeImages.includes(key) && oldDoc[key] != null) {
          deleteFileOrFiles(oldDoc[key]);
          oldDoc[key] = undefined;
        } else if (
          req.pushImages &&
          req.pushImages.some(obj => key in obj) &&
          oldDoc[key] != null
        ) {
          deleteFileOrFiles(oldDoc[key]);
          if (Model.schema.paths[key] instanceof mongoose.Schema.Types.String) {
            const newImage = req.pushImages.find(obj => key in obj)[key];
            oldDoc[key] = Array.isArray(newImage) ? newImage[0] : newImage;
          } else {
            const newImage = req.pushImages.find(obj => key in obj)[key];
            oldDoc[key] = Array.isArray(newImage) ? newImage : [newImage];
          }
        } else {
          const newKey = key;
          const sp = newKey.split('.');
          if (sp.length === 1) oldDoc[key] = req.body[key];
          else {
            let currentLevel = oldDoc;
            for (let i = 0; i < sp.length - 1; i++) {
              if (!currentLevel[sp[i]]) currentLevel[sp[i]] = {};
              currentLevel = currentLevel[sp[i]];
            }
            currentLevel[sp[sp.length - 1]] =
              Object.keys(req.body[key] || {}).length === 0 ? undefined : req.body[key];
          }
        }
      }
    }
    for (let i = 0; (req.saveImages || []).length > i; i++) await req.saveImages[i]();

    // Sanitize the updated document by omitting specified fields
    const sanitizedDoc = _.omit(oldDoc, fieldsToOmitFromResponse);

    let responseData = {
      status: 'success',
      message: tr($.updated_successfully),
      [getSingularFromList(Model.modelName)]: sanitizedDoc,
    };

    if (callback) responseData = await callback(responseData);

    res.status(200).json(responseData);
    return sanitizedDoc;
  };

exports.deleteOne =
  ({ Model, filterDeveloper, softDelete = true, callback = null }) =>
  async (req, res, next) => {
    // Find and delete the document by its ID
    let document;
    if (softDelete) {
      document = await Model.removeOne(req.params.id, filterDeveloper);
    } else {
      document = await Model.findOneAndDelete({ _id: req.params.id, ...filterDeveloper });
    }
    // If no document is found, return a 404 error

    if (document === null || (document && document.deleted_at)) {
      return next(
        new ApiError(
          [$.no_found, getSingularFromList(Model.modelName), $.for_this_id, req.params.id],
          404,
          { merge: true },
        ),
      );
    }
    if (callback) await callback(document);

    res.status(204).send();
    return document;
  };

exports.deleteMany =
  ({ Model }) =>
  async (req, res, next) => {
    // Extract IDs from the request body
    const { ids } = req.body;
    let idsNotFound = [];
    let deletedIds = [];
    // If IDs are provided and they are in array format
    if (Array.isArray(ids) && ids.length) {
      // Find documents with the provided IDs

      const foundDocuments = await Model.find({
        _id: { $in: ids },
        deleted_at: { $exists: undefined },
      }).select('_id');
      console.log('🚀 ~ foundDocuments:', foundDocuments);

      const foundIds = foundDocuments.map(doc => doc._id.toString());
      // Filter out IDs that were not found
      idsNotFound = ids.filter(id => !foundIds.includes(id));
      // If some identifiers are not found, return a 404 error
      if (idsNotFound.length) {
        return next(
          new ApiError($.unable_to_find_some_identifiers, 404, { data: { idsNotFound } }),
        );
      }
      // Store the IDs to be deleted
      deletedIds = foundIds;
    }
    // Construct a filter to delete documents with the provided IDs
    const filter = ids ? { _id: { $in: deletedIds } } : {};
    // Delete documents based on the filter
    const { modifiedCount } = await Model.removeMany(filter);
    // If no documents were deleted, return a 404 error
    if (!modifiedCount) {
      return next(
        new ApiError([$.no_found, Model.modelName, $.for_deletion], 404, {
          merge: true,
        }),
      );
    }
    res.status(204).send();
  };

exports.blockOne =
  ({ Model }) =>
  async (req, res, next) => {
    // Find and delete the document by its ID
    const document = await Model.findById(req.params.id);

    // If no document is found, return a 404 error

    if (document === null || (document && document.deleted_at)) {
      return next(
        new ApiError(
          [
            $.the_document_with_id,
            req.params.id,
            $.has_been_deleted_or_not_found_and_cannot_be_accessed,
          ],
          404,
          {
            merge: true,
          },
        ),
      );
    }
    if (document.blocked) {
      return next(
        new ApiError([$.the_document_with_id, req.params.id, $.is_already_blocked], 409, {
          merge: true,
        }),
      );
    }

    document.blocked = {
      support_id: req.admin._id,
      username: req.admin.username,
      blocked_at: new Date(),
    };
    await document.save();
    // await Model.updateOne(
    //   { _id: req.params.id },
    //   {
    //     'blocked.support_id': req.admin._id,
    //     'blocked.username': req.admin.username,
    //     'blocked.blocked_at': new Date(),
    //   },
    // );
    return res.status(200).json({
      status: 'success',
      message: `${tr($.the_document_with_id)} ${req.params.id} ${tr($.has_been_successfully_blocked)}`,
    });
  };

exports.unBlockOne =
  ({ Model }) =>
  async (req, res, next) => {
    try {
      // Find the document by its ID
      const document = await Model.findById(req.params.id);

      // If no document is found, return a 404 error
      if (!document || document.deleted_at) {
        return next(
          new ApiError(
            [
              $.the_document_with_id,
              req.params.id,
              $.has_been_deleted_or_not_found_and_cannot_be_accessed,
            ],
            404,
            {
              merge: true,
            },
          ),
        );
      }

      // If the document is not blocked, return a 409 conflict error
      if (!document.blocked) {
        return next(
          new ApiError([$.the_document_with_id, req.params.id, $.is_not_blocked], 409, {
            merge: true,
          }),
        );
      }

      // Unset the 'blocked' field and save the document
      document.blocked = undefined;
      await document.save();

      // If everything is successful, return a success response
      return res.status(200).json({
        status: 'success',
        message: `${tr($.the_document_with_id)} ${req.params.id} ${tr($.has_been_successfully_unblocked)}`,
      });
    } catch (error) {
      // Handle any unexpected errors
      return next(error);
    }
  };
