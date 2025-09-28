exports.extractHashtags = text => {
  const matches = text.match(/#\w+/g);
  return Array.from(new Set((matches ?? []).map(hashtag => hashtag.substring(1).toLowerCase())));
};
