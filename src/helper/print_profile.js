const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

const PDFUtility = require('./PDFUtility');
const { getLogoBytes, getImageBytes, defaultImageBytes } = require('./get_logo_bytes');

const imageBytes = getLogoBytes();

async function printProfile(data) {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  // Embed the images
  const logoImage = await pdfDoc.embedPng(imageBytes);
  const profileImage = await pdfDoc.embedJpg(
    data.profile_image
      ? (await getImageBytes(data.profile_image)) || defaultImageBytes()
      : defaultImageBytes(),
  );

  // Add a blank page to the document
  let page = pdfDoc.addPage();
  const pdfUtility = new PDFUtility(pdfDoc, page, timesRomanFont);

  await pdfUtility.initializeFonts();

  await pdfUtility.printBold('PROFINDER PROFILE', 4, true);

  // Place the profile image at the top left
  const profileImageWidth = 100;
  const profileImageHeight = 100;
  page.drawImage(profileImage, {
    x: pdfUtility.margin,
    y: pdfUtility.height - profileImageHeight - pdfUtility.margin - 25,
    width: profileImageWidth,
    height: profileImageHeight,
  });

  pdfUtility.yPosition = pdfUtility.height - pdfUtility.margin - pdfUtility.fontSize - 25;
  const textXPosition = pdfUtility.margin + profileImageWidth + 10; // Adjust the text position to the right of the profile image

  // Print Full Name, Phone, Address, and Email to the right of the profile image
  pdfUtility.page.drawText(`Full Name: ${data.full_name}`, {
    x: textXPosition,
    y: pdfUtility.yPosition,
    size: pdfUtility.fontSize,
    font: timesRomanFont,
    color: rgb(0, 0, 0),
  });
  pdfUtility.yPosition -= pdfUtility.fontSize + 4;

  if (data.address) {
    pdfUtility.page.drawText(
      `Address: ${data.address.street + ',' || ''} ${data.address.city + ',' || ''} ${data.address.conservative + ',' || ''} ${data.address.country || ''}`,
      {
        x: textXPosition,
        y: pdfUtility.yPosition,
        size: pdfUtility.fontSize,
        font: timesRomanFont,
        color: rgb(0, 0, 0),
      },
    );
    pdfUtility.yPosition -= pdfUtility.fontSize + 4;
  }

  if (data.email) {
    pdfUtility.page.drawText(`Email: ${data.email}`, {
      x: textXPosition,
      y: pdfUtility.yPosition,
      size: pdfUtility.fontSize,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    });
    pdfUtility.yPosition -= pdfUtility.fontSize + 4;
  }

  if (data.date_of_birth) {
    pdfUtility.page.drawText(`Date of Birth: ${data.date_of_birth?.toLocaleDateString('en-GB')}`, {
      x: textXPosition,
      y: pdfUtility.yPosition,
      size: pdfUtility.fontSize,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    });
    pdfUtility.yPosition -= pdfUtility.fontSize + 4;
  }

  if (data.gender) {
    pdfUtility.page.drawText(`Gender: ${data.gender}`, {
      x: textXPosition,
      y: pdfUtility.yPosition,
      size: pdfUtility.fontSize,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    });
    pdfUtility.yPosition -= pdfUtility.fontSize + 4;
  }

  if (data.phone) {
    pdfUtility.page.drawText(`Phone: ${data.phone}`, {
      x: textXPosition,
      y: pdfUtility.yPosition,
      size: pdfUtility.fontSize,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    });
    pdfUtility.yPosition -= pdfUtility.fontSize + 4;
  }

  // Move the yPosition for the main content
  pdfUtility.yPosition -= 20;

  // Main content
  if (data.bio) pdfUtility.printKeyValue('Bio', data.bio, true);
  pdfUtility.printBreakLine();

  if (data.social_media_links?.length > 0) {
    pdfUtility.printLine('Social Media Links', '', true);
    data.social_media_links.forEach(link => {
      pdfUtility.printLine(` - ${link.platform_id?.name || 'platform'}`, link.link);
    });
    pdfUtility.printBreakLine();
  }

  if (data.certifications?.length > 0) {
    pdfUtility.printLine('Certifications', '', true);
    data.certifications.forEach(certification => {
      pdfUtility.printKeyValue(` - Title`, certification.title);
      pdfUtility.printKeyValue(`   Organization`, certification.organization);
      if (certification.issue_date)
        pdfUtility.printKeyValue(
          `   Issue Date`,
          certification.issue_date?.toLocaleDateString('en-GB'),
        );
      if (certification.expiration_date)
        pdfUtility.printKeyValue(
          `   Expiration Date`,
          certification.expiration_date?.toLocaleDateString('en-GB'),
        );
      pdfUtility.printKeyValue(`   Description`, certification.description);
      pdfUtility.printKeyValue(`   Link`, certification.link);
      pdfUtility.printBreakLine();
    });
  }

  if (data.work_experiences?.length > 0) {
    pdfUtility.printLine('Work Experiences', '', true);
    data.work_experiences.forEach(experience => {
      pdfUtility.printKeyValue(` - Position`, experience.position);
      pdfUtility.printKeyValue(`   Company`, experience.company);
      pdfUtility.printKeyValue(`   Location`, experience.location);
      if (experience.start_date)
        pdfUtility.printKeyValue(
          `   Start Date`,
          experience.start_date?.toLocaleDateString('en-GB'),
        );
      if (experience.end_date)
        pdfUtility.printKeyValue(
          `   End Date`,
          experience.end_date?.toLocaleDateString('en-GB') || 'Present',
        );
      pdfUtility.printKeyValue(`   Responsibilities`, experience.responsibilities);
      pdfUtility.printBreakLine();
    });
  }

  if (data.languages?.length > 0) {
    pdfUtility.printLine('Languages', '', true);
    data.languages.forEach(language => {
      pdfUtility.printKeyValue(` - Language`, language.language);
      pdfUtility.printKeyValue(`   Proficiency`, language.proficiency);
      pdfUtility.printBreakLine();
    });
  }

  if (data.projects?.length > 0) {
    pdfUtility.printLine('Projects', '', true);
    data.projects.forEach(project => {
      pdfUtility.printKeyValue(` - Title`, project.title);
      pdfUtility.printKeyValue(`   Description`, project.description);
      if (project.start_date)
        pdfUtility.printKeyValue(`   Start Date`, project.start_date?.toLocaleDateString('en-GB'));
      if (project.end_date)
        pdfUtility.printKeyValue(`   End Date`, project.end_date?.toLocaleDateString('en-GB'));
      if (project.skills_used)
        pdfUtility.printKeyValue(`   Skills Used`, project.skills_used?.join(', '));
      pdfUtility.printBreakLine();
    });
  }

  if (data.educations?.length > 0) {
    pdfUtility.printLine('Education', '', true);
    data.educations.forEach(education => {
      pdfUtility.printKeyValue(` - Institution`, education.institution);
      pdfUtility.printKeyValue(`   Degree`, education.degree);
      pdfUtility.printKeyValue(`   Field of Study`, education.field_of_study);
      if (education.start_date)
        pdfUtility.printKeyValue(
          `   Start Date`,
          education.start_date?.toLocaleDateString('en-GB'),
        );
      if (education.end_date)
        pdfUtility.printKeyValue(`   End Date`, education.end_date?.toLocaleDateString('en-GB'));
      pdfUtility.printBreakLine();
    });
  }

  if (data.skills?.length > 0) {
    pdfUtility.printLine('Skills', '', true);
    data.skills.forEach(skill => {
      pdfUtility.printKeyValue(` - Skill`, skill.skill);
      pdfUtility.printKeyValue(`   Proficiency`, skill.proficiency);
      pdfUtility.printBreakLine();
    });
  }

  const pages = pdfDoc.getPages();
  const logoImageWidth = 50;
  const logoImageHeight = 50;
  pages.forEach(page => {
    page.drawImage(logoImage, {
      x: page.getWidth() - logoImageWidth - 50,
      y: 50,
      width: logoImageWidth,
      height: logoImageHeight,
    });
  });

  // Serialize the PDFDocument to bytes (a Uint8Array)
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

module.exports = printProfile;
