//! Ayman ----

//- users
const usersManagementRoute = require('./users/users_management_route');
const usersAuthenticationRoute = require('./users/users_authentication_route');

//- admins
const adminsAuthenticationRoute = require('./admins/admins_authentication_route');
const adminManagementRoute = require('./admins/admins_management_route');

//- super admin
const superAdminRoute = require('./superAdmins/super_admins_route');

//- oauth2
const oauth2GithubRoute = require('./oauth2/github_route');
const oauth2GoogleRoute = require('./oauth2/google_route');

//- profiles
const profilesRoute = require('./profiles');

//- social media platform
const adminSocialMediaPlatformRoute = require('./social_media_platform_route/admin_social_media_platform_route');
const publicSocialMediaPlatformRoute = require('./social_media_platform_route/public_social_media_platform_route');

//- follow
const usersFollowRoute = require('./follow/user_follow_route');
const publicFollowRoute = require('./follow/public_follow_route');

//- posts
const usersPostsRoute = require('./posts_and_related/posts/users_posts_route');
const adminsPostsRoute = require('./posts_and_related/posts/admins_posts_route');
const publicPostsRoute = require('./posts_and_related/posts/public_posts_route');

//- comments
const usersCommentsRoute = require('./posts_and_related/comments/users_comments_route');
const adminsCommentsRoute = require('./posts_and_related/comments/admin_comments_route');
const publicCommentsRoute = require('./posts_and_related/comments/public_comments_route');

//- likes
const usersLikesRoute = require('./posts_and_related/likes/user_likes_route');
const adminsLikesRoute = require('./posts_and_related/likes/admins_likes_route');
const publicLikesRoute = require('./posts_and_related/likes/public_likes_route');

//- hashtags
const adminsHashtagsRoute = require('./posts_and_related/hashtages/admins_hashtages_route');

//- posts-hashtags
const usersPostsHashtagsRoute = require('./posts_and_related/posts_hashtags/users_posts_hashtages_route');
const adminsPostsHashtagsRoute = require('./posts_and_related/posts_hashtags/admins_posts_hashtages_route');

//- save-post
const usersSavedPostRoute = require('./posts_and_related/saved_post/users_saved_post_route');

//- notifiations
const userNotificationsRoute = require('./firebase/notifications_route');

//- support-center-messages
const usersSupportCenterMessagesRoute = require('./support_center/users_support_center_messages_route');
const adminsSupportCenterMessagesRoute = require('./support_center/admins_support_center_messages_route');

//- support-center-conversations
const usersSupportCenterConversationsRoute = require('./support_center/users_support_center_conversations_route');
const adminsSupportCenterConversationsRoute = require('./support_center/admins_support_center_conversations_route');

//- device_tokens
const deviceTokensRoute = require('./firebase/device_tokens_route');

//- interests
const interestsRouter = require('./interests/interests_router');

//- topics
const publicTopicsPostsRoute = require('./topics_posts/pubic_topics_posts_route');

//! Ahmad ----

//- company applications
const adminApplicationsRoute = require('./company_applications/admin_applications_route');
const userApplicationsRoute = require('./company_applications/user_applications_route');

//- company account
const founderCompaniesRoute = require('./companies/founder_companies_route');
const managerCompaniesRoute = require('./companies/manager_companies_route');
const adminCompaniesRoute = require('./companies/admin_companies_route');
const exploreCompaniesRoute = require('./companies/explore_companies_route');

//- job
const managerJobsRoute = require('../routes/jobs/manager_jobs_route');
const exploreJobsRoute = require('../routes/jobs/explore_jobs_route');
const adminJobsRoute = require('../routes/jobs/admin_jobs_route');

//- freelance projects
const userFreelanceRoute = require('./freelance_projects/user_freelance_route');
const exploreFreelanceRoute = require('./freelance_projects/explore_freelance_route');
const adminFreelanceRoute = require('./freelance_projects/admin_freelance_route');

//- wallets
const adminWalletRoute = require('./wallets/admin_wallets_route');
const userWalletRoute = require('./wallets/user_wallets_route');

//- contracts
const userContractRoute = require('./freelance_contracts/user_contracts_routes');
const exploreContractRoute = require('./freelance_contracts/explore_contracts_routes');
const adminContractRoute = require('./freelance_contracts/admin_contracts_routes');

//- reports
const adminReportsRoute = require('../routes/reports/admin_reports_routes');

// - registers
const adminRegistersRoute = require('./registers/admin_registers_routes');

const myRoutes = app => {
  //- Ayman
  // Super admin routes
  app.use('/api/super-admins/admins', adminManagementRoute);
  app.use('/api/super-admins', superAdminRoute);

  // OAuth2 routes
  app.use('/api/oauth2/google', oauth2GoogleRoute);
  app.use('/api/oauth2/github', oauth2GithubRoute);

  // Admin authentication routes
  app.use('/api/admins', adminsAuthenticationRoute);

  // User authentication routes
  app.use('/api/users', usersAuthenticationRoute);

  // Admin user management routes
  app.use('/api/admins/users', usersManagementRoute);

  //profiles
  app.use('/api/users/profiles', profilesRoute.users);
  app.use('/api/public/profiles', profilesRoute.public);

  // social media platform
  app.use('/api/admins/social-media-platforms', adminSocialMediaPlatformRoute);
  app.use('/api/public/social-media-platforms', publicSocialMediaPlatformRoute);

  // follow
  app.use('/api/users/follow', usersFollowRoute);
  app.use('/api/public/follow', publicFollowRoute);

  // posts
  app.use('/api/users/posts', usersPostsRoute);
  app.use('/api/admins/posts', adminsPostsRoute);
  app.use('/api/public/posts', publicPostsRoute);

  // comments
  app.use('/api/users/comments', usersCommentsRoute);
  app.use('/api/admins/comments', adminsCommentsRoute);
  app.use('/api/public/', publicCommentsRoute);

  // likes
  app.use('/api/users/likes', usersLikesRoute);
  app.use('/api/admins/likes', adminsLikesRoute);
  app.use('/api/public/', publicLikesRoute);

  // hashtags
  app.use('/api/admins/hashtags', adminsHashtagsRoute);

  // hashtags
  app.use('/api/users/notifications', userNotificationsRoute);

  // posts-hashtags
  app.use('/api/users/posts-hashtags', usersPostsHashtagsRoute);
  app.use('/api/admins/posts-hashtags', adminsPostsHashtagsRoute);

  // saved-post
  app.use('/api/users/saved-post', usersSavedPostRoute);

  // support-center-messages
  app.use('/api/users/support-center-messages', usersSupportCenterMessagesRoute);
  app.use('/api/admins/support-center-messages', adminsSupportCenterMessagesRoute);

  // support-center-conversation
  app.use('/api/users/support-center-conversations', usersSupportCenterConversationsRoute);
  app.use('/api/admins/support-center-conversations', adminsSupportCenterConversationsRoute);

  // support-center-conversation

  app.use('/api/users/device-token', deviceTokensRoute);

  // interests
  app.use('/api/users/interests', interestsRouter);

  // topics
  app.use('/api/public/topics', publicTopicsPostsRoute);

  // --- !| Ahmad |!---

  // 1 - company account applications feature.
  app.use('/api/user/company-applications/', userApplicationsRoute);
  app.use('/api/admin/company-applications/', adminApplicationsRoute);

  // 2 - job feature
  app.use('/api/manager/companies/:company_id/jobs', managerJobsRoute);
  app.use('/api/explore/jobs/', exploreJobsRoute);
  app.use('/api/admin/jobs/', adminJobsRoute);

  // 3 - company account feature .
  app.use('/api/user/companies', founderCompaniesRoute);
  app.use('/api/manager/companies', managerCompaniesRoute);
  app.use('/api/admin/companies', adminCompaniesRoute);
  app.use('/api/explore/companies', exploreCompaniesRoute);

  // 4 - freelance projects feature
  app.use('/api/user/freelance-projects', userFreelanceRoute);
  app.use('/api/explore/freelance-projects', exploreFreelanceRoute);
  app.use('/api/admin/freelance-projects', adminFreelanceRoute);

  // 5 - wallets
  app.use('/api/admin/wallets', adminWalletRoute);
  app.use('/api/user/wallets', userWalletRoute);

  // 6 - contracts
  app.use('/api/user/freelance-contracts', userContractRoute);
  app.use('/api/explore/freelance-contracts', exploreContractRoute);
  app.use('/api/admin/freelance-contracts', adminContractRoute);

  //  - reports
  app.use('/api/admin/reports', adminReportsRoute);

  // - registers
  app.use('/api/admin/registers', adminRegistersRoute);
};

module.exports = myRoutes;
