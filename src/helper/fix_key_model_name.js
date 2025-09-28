function getSingularFromList(pluralWord) {
  pluralWord = pluralWord.toLowerCase();

  const list = {
    users: 'user',
    admins: 'admin',
    superAdmins: 'superAdmin',
    superadmins: 'superadmin',
    profiles: 'profile',
    companies: 'company',
    companyapplications: 'companyApplication',
    socialmediaplatforms: 'socialMediaPlatform',
    jobs: 'job',
    posts: 'post',
    comments: 'comment',
    freelanceprojects: 'freelance_project',
    wallets: 'wallet',
    cashtransactions: 'cash_transaction',
    contracts: 'contract',
    supportcenterconversations: 'support_center_conversation',
    supportcentermessages: 'support_center_message',
  };

  return list[pluralWord] || pluralWord;
}

function convertToSnakeCase(pluralWord) {
  pluralWord = pluralWord.toLowerCase();

  const list = {
    devicetokens: 'device_tokens',
    supportcenterconversations: 'support_center_conversations',
    supportcentermessages: 'support_center_messages',
  };

  return list[pluralWord] || pluralWord;
}
module.exports = { getSingularFromList, convertToSnakeCase };
