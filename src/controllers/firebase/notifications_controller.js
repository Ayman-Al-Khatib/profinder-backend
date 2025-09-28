const factory = require('../../helper/handlers_factory');
const Notification = require('../../models/notifications_model');
const User = require('../../models/users_model');
const Profile = require('../../models/profile');
const Company = require('../../models/companies_model');
const tr = require('../../helper/translate');

exports.getAllNotifications = async (req, res, next) => {
  return factory.getAll({
    Model: Notification,
    filterDeveloper: {
      receivers: req.user.id,
    },
    fieldsToOmitFromResponse: ['receivers'],

    callback: async response => {
      response.notifications = await Promise.all(
        response.notifications.map(async notification => {
          //-USERS
          if (notification.special_data?.type === 'Users') {
            const userId = notification.special_data.data;
            const user = await User.findById(userId).select('username profile_image').lean();
            const profile = await Profile.findById(userId).select('full_name').lean();
            notification.special_data.data = {
              ...user,
              full_name: profile.full_name,
            };
          }

          //- COMPANIES
          else if (notification.special_data?.type === 'Companies') {
            const companyId = notification.special_data.data;
            const company = await Company.findById(companyId).select('name image').lean();

            notification.special_data.data = company;
          }
          //- ELSE

          return notification;
        }),
      );

      const trNotification = response.notifications.map(notification => {
        notification.title = tr(notification.title);
        notification.body = tr(notification.body);
        return notification;
      });

      response.notifications = trNotification;
      return response;
    },
  })(req, res, next);
};
