const { PDFDocument, StandardFonts } = require('pdf-lib');

const PDFUtility = require('./PDFUtility');
const { getLogoBytes } = require('./get_logo_bytes');

const imageBytes = getLogoBytes();

async function printContract(data) {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  // Embed the image
  const image = await pdfDoc.embedPng(imageBytes);

  // Add a blank page to the document
  let page = pdfDoc.addPage();
  const pdfUtility = new PDFUtility(pdfDoc, page, timesRomanFont);

  await pdfUtility.initializeFonts();

  // Place the image at the top center
  const imageWidth = 75;
  const imageHeight = 75;
  page.drawImage(image, {
    x: (pdfUtility.width - imageWidth) / 2,
    y: pdfUtility.height - imageHeight - pdfUtility.margin,
    width: imageWidth,
    height: imageHeight,
  });

  pdfUtility.yPosition -= imageHeight + pdfUtility.margin + pdfUtility.fontSize + 4 - 40;

  await pdfUtility.printBold('PROFINDER CONTRACT', 4, true);

  pdfUtility.printKeyValue('Title', data.freelance_project_id?.title, true);
  pdfUtility.printBreakLine(3);
  pdfUtility.printKeyValue('Service Publisher Username', data.service_publisher_id?.username, true);
  pdfUtility.printBreakLine(3);
  pdfUtility.printKeyValue('Service Executor Username', data.service_executor_id?.username, true);
  pdfUtility.printBreakLine(3);
  pdfUtility.printKeyValue('Status', data.status, true);
  pdfUtility.printBreakLine();
  pdfUtility.printKeyValue('Description', data.description, true);
  pdfUtility.printBreakLine();
  pdfUtility.printKeyValue('Terms and Conditions', data.terms_and_conditions, true);
  pdfUtility.printBreakLine();
  if (data.attached_links?.length > 0) {
    pdfUtility.printKeyValue('Attached Links', '', true);
    data.attached_links.forEach((link, index) => {
      pdfUtility.printLine(` - Link ${index + 1}`, link);
    });
    pdfUtility.printBreakLine(3);
  }

  if (data.attached_files?.length > 0) {
    pdfUtility.printKeyValue('Attached Files', '', true);
    data.attached_files.forEach((file, index) => {
      pdfUtility.printLine(` - File ${index + 1}:`, '');
      pdfUtility.printLine('     Original Name', file.originalname);
      pdfUtility.printLine('     Encoding', file.encoding);
      pdfUtility.printLine('     MimeType', file.mimetype);
      pdfUtility.printLine('     Size', file.size);
      pdfUtility.printKeyValue('     URL', file.url);
      pdfUtility.printBreakLine(3);
    });
  }
  pdfUtility.printKeyValue('Payment', data.payment + '', true);
  pdfUtility.printKeyValue('Original Wallet Transaction ', '', true);
  pdfUtility.printKeyValue(
    '  - Application Profit',
    data.wallet_transaction_id.application_profit + '',
  );
  pdfUtility.printKeyValue('  - Amount', data.wallet_transaction_id.amount + '');
  pdfUtility.printKeyValue('  - Status', data.wallet_transaction_id.status + '');

  if (data.start_date)
    pdfUtility.printKeyValue('Start Date', data.start_date.toLocaleDateString('en-GB'), true);
  if (data.deadline)
    pdfUtility.printKeyValue('Deadline', data.deadline.toLocaleDateString('en-GB'), true);

  if (data.end_date) {
    pdfUtility.printKeyValue('End Date', data.end_date.toLocaleDateString('en-GB'), true);
  }
  pdfUtility.printBreakLine(3);
  if (data.responsibile_support) {
    pdfUtility.printKeyValue('Responsible Support ', '', true);
    pdfUtility.printKeyValue('  - Name', data.responsibile_support.name);
    pdfUtility.printKeyValue('  - Documentary', data.responsibile_support.documentry);
    pdfUtility.printKeyValue(
      '  - Wallet Transaction ',
      data.responsibile_support.wallet_transaction_id._id,
    );
    pdfUtility.printKeyValue(
      '    - Application Profit',
      data.responsibile_support.wallet_transaction_id.application_profit + '',
    );
    pdfUtility.printKeyValue(
      '    - Amount',
      data.responsibile_support.wallet_transaction_id.amount + '',
    );
    pdfUtility.printKeyValue(
      '    - Status',
      data.responsibile_support.wallet_transaction_id.status,
    );
  }

  // Serialize the PDFDocument to bytes (a Uint8Array)
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

module.exports = printContract;
