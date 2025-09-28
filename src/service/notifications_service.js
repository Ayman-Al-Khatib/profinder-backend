const admin = require('firebase-admin');
const redis = require('../config/redis_config');
const Topic = require('../models/topics/topics_fcm_model');
const tr = require('../helper/translate');
/**
 * Sends a notification to a single device token.
 * @param {string} token - The device token to send the notification to.
 * @param {string} title - The title of the notification.
 * @param {string} body - The body/content of the notification.
 * @param {string} id - Identifier associated with the token.
 * @param {object} extraData - Additional data to be sent along with the notification.
 * @param {string} image - URL of the image to be included in the notification.
 * @returns {Promise<Array|object>} - Returns an empty array if successful, or { token, id } on failure.
 */
async function sendNotificationToSingleToken(token, title, body, id, extraData, image) {
  if (typeof token !== 'string' || !title || !body || typeof id !== 'string') {
    console.error('token and id must be strings, and title and body are required');
    return;
  }
  const lang = await redis.get(`${id}:lang`);

  const message = {
    notification: {
      title: tr(title, lang),
      body: tr(body, lang),
      image,
    },
    data: extraData,
    token: token,
  };

  try {
    await admin.messaging().send(message);
    return []; // Empty array indicates success
  } catch {
    // If sending notification fails, delete the token from Redis
    deleteTokens(id);
    return { token, id }; // Return token and id on failure
  }
}

/**
 * Sends notifications to multiple device tokens.
 * @param {Array<string>} tokens - Array of device tokens to send notifications to.
 * @param {string} title - The title of the notifications.
 * @param {string} body - The body/content of the notifications.
 * @param {Array<string>} ids - Array of identifiers associated with each token.
 * @param {object} extraData - Additional data to be sent along with the notifications.
 * @param {string} image - URL of the image to be included in the notifications.
 * @returns {Promise<object>} - Returns { failedTokens, failedIds } containing arrays of tokens and corresponding ids that failed.
 */
async function sendNotificationToMultipleTokens(tokens, title, body, ids, extraData, image) {
  if (
    !Array.isArray(tokens) ||
    tokens.length === 0 ||
    typeof title !== 'string' ||
    typeof body !== 'string' ||
    !Array.isArray(ids) ||
    ids.length === 0 ||
    tokens.length !== ids.length
  ) {
    console.error('tokens and ids must be non-empty arrays/lists with the same length');
    return;
  }

  const batchSize = 500;
  const failedTokens = [];
  const failedIds = [];

  const keysLang = ids.map(id => `${id}:lang`);
  const langs = await redis.mGet(keysLang);

  const tokensAr = [];
  const tokensEn = [];

  for (let i = 0; i < tokens.length; i++) {
    if (langs[i] === 'ar') {
      tokensAr.push(tokens[i]);
    } else {
      tokensEn.push(tokens[i]);
    }
  }
  const resAr = await spiltQuery_AR_EN(tokensAr, 'ar');
  const resEn = await spiltQuery_AR_EN(tokensEn, 'en');
  return {
    failedTokens: (resAr ? resAr.failedTokens : []).concat(resEn ? resEn.failedTokens : []),
    failedIds: (resAr ? resAr.failedIds : []).concat(resEn ? resEn.failedIds : []),
  };

  // Split tokens into (batches, lang) and create messages
  async function spiltQuery_AR_EN(tokens, lang) {
    if (tokens.length == 0) return null;
    const messages = [];

    for (let i = 0; i < tokens.length; i += batchSize) {
      const batchTokens = tokens.slice(i, i + batchSize);

      const message = {
        notification: {
          title: tr(title, lang),
          body: tr(body, lang),
          image,
        },
        data: extraData,
        tokens: batchTokens,
      };

      messages.push(message);
    }

    try {
      // Send each batch of messages to Firebase Cloud Messaging
      const responses = await Promise.allSettled(
        messages.map(msg => admin.messaging().sendEachForMulticast(msg)),
      );

      // Process responses to determine which tokens failed
      responses.forEach((response, index) => {
        if (response.status === 'fulfilled') {
          response.value.responses.forEach((res, idx) => {
            if (res.error) {
              failedTokens.push(messages[index].tokens[idx]);
              failedIds.push(ids[idx]);
            }
          });
        } else {
          // If sending a batch fails, add all tokens and ids from that batch to failed lists
          messages[index].tokens.forEach(token => {
            failedTokens.push(token);
          });

          const endIdx = (index + 1) * batchSize;
          const sliceEnd = endIdx > ids.length ? ids.length : endIdx;
          failedIds.push(...ids.slice(index * batchSize, sliceEnd));
        }
      });

      // Delete tokens that failed from Redis
      deleteTokens(failedIds);

      return { failedTokens, failedIds };
    } catch {
      return null; // Return empty array on error
    }
  }
}

/**
 * Sends a notification to a topic.
 * @param {string} topic - The topic to send the notification to.
 * @param {string} title - The title of the notification.
 * @param {string} body - The body/content of the notification.
 * @param {object} extraData - Additional data to be sent along with the notification.
 * @param {string} image - URL of the image to be included in the notification.
 * @returns {Promise<object>} - Returns { success: true } if successful, { success: false } on failure.
 */
async function sendNotificationToTopic(topic, title, body, extraData, image) {
  if (!topic || !title || !body) {
    console.error('topic, title, and body are required');
    return;
  }

  const messageAr = {
    notification: {
      title: tr(title, 'ar'),
      body: tr(body, 'ar'),
      image,
    },
    data: extraData,
    topic: topic,
  };
  const messageEn = {
    notification: {
      title: tr(title, 'en'),
      body: tr(body, 'en'),
      image,
    },
    data: extraData,
    topic: topic,
  };

  try {
    await admin.messaging().send(messageAr);
    await admin.messaging().send(messageEn);
    return { success: true }; // Return success object if notification is sent successfully
  } catch {
    return { success: false }; // Return failure object if sending notification fails
  }
}

/**
 * Sends a notification with a condition.
 * @param {string} condition - The condition to send the notification based on.
 * @param {string} title - The title of the notification.
 * @param {string} body - The body/content of the notification.
 * @param {object} extraData - Additional data to be sent along with the notification.
 * @param {string} image - URL of the image to be included in the notification.
 * @returns {Promise<object>} - Returns { success: true } if successful, { success: false } on failure.
 */
async function sendNotificationWithCondition(condition, title, body, extraData, image) {
  if (!condition || !title || !body) {
    console.error('condition, title, and body are required');
    return;
  }

  const message = {
    notification: {
      title,
      body,
      image,
    },
    data: extraData,
    condition: condition,
  };

  try {
    await admin.messaging().send(message);
    return { success: true }; // Return success object if notification is sent successfully
  } catch {
    return { success: false }; // Return failure object if sending notification fails
  }
}

/**
 * Subscribes device tokens to a topic.
 * @param {Array<string>} tokens - Array of device tokens to subscribe.
 * @param {string} topic - The topic to subscribe to.
 * @param {Array<string>} ids - Optional array of identifiers associated with each token.
 * @returns {Promise<object>} - Returns { failedIds, failureTokens } containing arrays of tokens and corresponding ids that failed.
 */
async function subscribeToTopic(tokens, topic, ids) {
  if (!tokens || !Array.isArray(tokens) || tokens.length === 0 || !topic) {
    console.error('tokens and topic must be an array and required');
    return;
  }

  if (ids && (!Array.isArray(ids) || ids.length !== tokens.length)) {
    console.error('ids must be an array with the same length as tokens');
    return;
  }

  const failureTokens = [];
  const successTokens = [];
  const failedIds = [];

  // Subscribe tokens to the topic using Firebase Admin
  const keysLang = ids.map(id => `${id}:lang`);
  const langs = await redis.mGet(keysLang);

  const tokensAr = [];
  const tokensEn = [];

  for (let i = 0; i < tokens.length; i++) {
    if (langs[i] === 'ar') {
      tokensAr.push(tokens[i]);
    } else {
      tokensEn.push(tokens[i]);
    }
  }

  let subscribeResponseAr;
  let subscribeResponseEn;

  if (tokensAr.length > 0) {
    subscribeResponseAr = await admin.messaging().subscribeToTopic(tokensAr, `${topic}_ar`);
  }
  if (tokensEn.length > 0) {
    subscribeResponseEn = await admin.messaging().subscribeToTopic(tokensEn, `${topic}_en`);
  }

  const lErrorAr = subscribeResponseAr != null ? subscribeResponseAr.errors : [];
  const lErrorEn = subscribeResponseEn != null ? subscribeResponseEn.errors : [];
  const subscribeResponse = {
    errors: lErrorAr.concat(lErrorEn),
  };

  // Process responses to determine success or failure for each token
  let numErrors = subscribeResponse.errors.length;
  let foundError = 0;

  for (let i = 0; i < tokens.length; i++) {
    const indexError = subscribeResponse.errors[foundError]?.index;
    if (indexError == i && foundError < numErrors) {
      foundError++;
      failureTokens.push(tokens[i]);
      failedIds.push(ids[i]);
    } else {
      successTokens.push(tokens[i]);
    }
  }

  // Delete tokens that failed to subscribe from Redis
  deleteTokens(failedIds);

  if (successTokens.length > 0) {
    await Topic.updateMany(
      { token: { $in: successTokens } },
      { $addToSet: { topics: topic } },
      { multi: true },
    );
  }

  return { failedIds, failureTokens, successTokens };
}

/**
 * Unsubscribes device tokens from a topic.
 * @param {Array<string>} tokens - Array of device tokens to unsubscribe.
 * @param {string} topic - The topic to unsubscribe from.
 * @param {Array<string>} ids - Optional array of identifiers associated with each token.
 * @returns {Promise<object>} - Returns { failedIds, failureTokens } containing arrays of tokens and corresponding ids that failed.
 */
async function unsubscribeFromTopic(tokens, topic, ids) {
  if (!tokens || !Array.isArray(tokens) || tokens.length === 0 || !topic) {
    console.error('tokens and topic are required');
    return;
  }

  if (ids && (!Array.isArray(ids) || ids.length !== tokens.length)) {
    console.error('ids must be an array with the same length as tokens');
    return;
  }

  const failureTokens = [];
  const successTokens = [];
  const failedIds = [];

  // Unsubscribe tokens to the topic using Firebase Admin
  const keysLang = ids.map(id => `${id}:lang`);
  const langs = await redis.mGet(keysLang);

  const tokensAr = [];
  const tokensEn = [];

  for (let i = 0; i < tokens.length; i++) {
    if (langs[i] === 'ar') {
      tokensAr.push(tokens[i]);
    } else {
      tokensEn.push(tokens[i]);
    }
  }

  let unSubscribeResponseAr;
  let unSubscribeResponseEn;

  if (tokensAr.length > 0) {
    unSubscribeResponseAr = await admin.messaging().unsubscribeFromTopic(tokensAr, `${topic}_ar`);
  }
  if (tokensEn.length > 0) {
    unSubscribeResponseEn = await admin.messaging().unsubscribeFromTopic(tokensEn, `${topic}_en`);
  }

  const lErrorAr = unSubscribeResponseAr != null ? unSubscribeResponseAr.errors : [];
  const lErrorEn = unSubscribeResponseEn != null ? unSubscribeResponseEn.errors : [];
  const unSubscribeResponse = {
    errors: lErrorAr.concat(lErrorEn),
  };

  // Process responses to determine success or failure for each token
  let numErrors = unSubscribeResponse.errors.length;
  let foundError = 0;

  for (let i = 0; i < tokens.length; i++) {
    const indexError = unSubscribeResponse.errors[foundError]?.index;
    if (indexError == i && foundError < numErrors) {
      foundError++;
      failureTokens.push(tokens[i]);
      failedIds.push(ids[i]);
    } else {
      successTokens.push(tokens[i]);
    }
  }

  // Delete tokens that failed to subscribe from Redis
  deleteTokens(failedIds);
  if (successTokens.length > 0) {
    await Topic.updateMany(
      { token: { $in: successTokens } },
      { $pull: { topics: topic } },
      { multi: true },
    );
  }
  return { failedIds, failureTokens, successTokens };
}

/**
 * Retrieves tokens from Redis based on provided IDs.
 * @param {Array<string>} ids - Array of identifiers to retrieve tokens for.
 * @returns {Promise<object>} - Returns { idsList, tokensList, foundKeyValuePairs, failedIds }.
 */
async function getTokens(ids) {
  if (
    !ids ||
    (typeof ids === 'string' && !ids.trim()) ||
    (Array.isArray(ids) && ids.length === 0)
  ) {
    console.error('No IDs provided for retrieval.');
    return null;
  }

  if (typeof ids === 'string') {
    ids = [ids];
  }

  const keysToken = ids.map(id => `${id}:token`);
  const keysLang = ids.map(id => `${id}:lang`);
  const tokens = await redis.mGet(keysToken);
  const langs = await redis.mGet(keysLang);

  const tokensList = [];
  const idsList = [];
  const foundKeyValuePairs = [];
  const langList = [];
  const failedIds = [];

  ids.forEach((id, index) => {
    const token = tokens[index];
    if (token) {
      const lang = langs[index];
      tokensList.push(token);
      idsList.push(id);
      langList.push(lang || 'ena');
      foundKeyValuePairs.push({ id, token });
    } else {
      failedIds.push(id);
    }
  });

  return {
    idsList,
    tokensList,
    foundKeyValuePairs,
    failedIds,
    langList,
  };
}

/**
 * Deletes tokens from Redis based on provided IDs.
 * @param {Array<string>} ids - Array of identifiers to delete tokens for.
 * @returns {Promise<number>} - Returns the number of tokens deleted.
 */
async function deleteTokens(ids) {
  if (
    !ids ||
    (typeof ids === 'string' && !ids.trim()) ||
    (Array.isArray(ids) && ids.length === 0)
  ) {
    console.error('No IDs provided for deletion.');
    return 0;
  }

  if (typeof ids === 'string') {
    ids = [ids];
  }

  const keys = ids.map(id => `${id}:token`);
  const deletedCount = await redis.del(keys);
  console.log('🚀 ~ deleteTokens ~ deletedCount:', deletedCount);

  return deletedCount;
}

module.exports = {
  sendNotificationToTopic,
  sendNotificationToMultipleTokens,
  sendNotificationToSingleToken,
  unsubscribeFromTopic,
  subscribeToTopic,
  sendNotificationWithCondition,
  deleteTokens,
  getTokens,
};
