const { rgb, StandardFonts } = require('pdf-lib');

class PDFUtility {
  constructor(pdfDoc, page, timesRomanFont, margin = 50, fontSize = 12) {
    this.pdfDoc = pdfDoc;
    this.page = page;
    this.timesRomanFont = timesRomanFont;
    this.margin = margin;
    this.fontSize = fontSize;
    this.yPosition = page.getSize().height - fontSize - margin;
    this.width = page.getSize().width;
    this.height = page.getSize().height;

    this.font = null;
  }

  async initializeFonts() {
    // Example: Embedding Times Roman font (replace with your actual font embedding code)
    this.font = await this.pdfDoc.embedFont(StandardFonts.TimesRoman);
    this.boldFont = await this.pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    this.boldFont;
  }

  addNewPage() {
    this.page = this.pdfDoc.addPage();
    this.yPosition = this.height - this.fontSize - this.margin;
  }

  printBreakLine(x = 16) {
    this.yPosition -= x;
    if (this.yPosition < this.margin) this.addNewPage();
  }

  printLine(key, value, bold = false) {
    value = value.toString();
    const keyXPosition = this.margin;
    const valueXPosition = this.margin + 150;
    const keyFont = bold ? this.boldFont : this.font;

    this.page.drawText(`${key}:`, {
      x: keyXPosition,
      y: this.yPosition,
      size: this.fontSize,
      font: keyFont,
      color: rgb(0, 0, 0),
    });
    this.page.drawText(value, {
      x: valueXPosition,
      y: this.yPosition,
      size: this.fontSize,
      font: this.font,
      color: rgb(0, 0, 0),
    });
    this.yPosition -= this.fontSize + 4;
    if (this.yPosition < this.margin) this.addNewPage();
  }

  printLongText(key, value, bold = false) {
    value = value.toString();

    let words;
    if (!value.includes(' ')) {
      let result = '';
      for (let i = 0; i < value.length; i += 70) {
        result += value.slice(i, i + 70) + ' ';
      }
      // Remove the trailing space if it exists
      words = result.trim().split(' ');
    } else {
      words = value.split(' ');
    }

    // const words = value.split(' ');
    const keyXPosition = this.margin;
    const valueXPosition = this.margin + 20;
    const maxLineLength = 80;

    const keyFont = bold ? this.boldFont : this.font;

    this.page.drawText(`${key}:`, {
      x: keyXPosition,
      y: this.yPosition,
      size: this.fontSize,
      font: keyFont,
      color: rgb(0, 0, 0),
    });
    this.yPosition -= this.fontSize + 4;
    if (this.yPosition < this.margin) this.addNewPage();

    let line = '';
    words.forEach(word => {
      if (line.length + word.length + 1 > maxLineLength) {
        this.page.drawText(line, {
          x: valueXPosition,
          y: this.yPosition,
          size: this.fontSize,
          font: this.font,
          color: rgb(0, 0, 0),
        });
        this.yPosition -= this.fontSize + 4;
        if (this.yPosition < this.margin) this.addNewPage();
        line = word;
      } else {
        if (line.length > 0) {
          line += ' ';
        }
        line += word;
      }
    });

    if (line.length > 0) {
      this.page.drawText(line, {
        x: valueXPosition,
        y: this.yPosition,
        size: this.fontSize,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      this.yPosition -= this.fontSize + 4;
      if (this.yPosition < this.margin) this.addNewPage();
    }
  }

  printKeyValue(key, value, bold = false) {
    if (typeof value === 'string' && value.length > 70) {
      this.printLongText(filterWinAnsi(key || ''), filterWinAnsi(value || ''), bold);
    } else {
      this.printLine(filterWinAnsi(key || ''), filterWinAnsi(value || ''), bold);
    }
  }

  async printBold(text, fontIncrease, center) {
    const fontSize = this.fontSize + fontIncrease; // Increase font size
    const boldFont = await this.pdfDoc.embedFont('Helvetica-Bold'); // Embedding bold Helvetica font

    const textWidth = boldFont.widthOfTextAtSize(filterWinAnsi(text), fontSize);
    const xPosition = center ? (this.width - textWidth) / 2 : this.margin + 20;

    this.page.drawText(filterWinAnsi(text), {
      x: xPosition,
      y: this.yPosition,
      size: fontSize,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    this.yPosition -= fontSize + 20;
  }
}

module.exports = PDFUtility;

function filterWinAnsi(text) {
  // WinAnsi character set (0x20 to 0x7E and 0xA0 to 0xFF)
  const winAnsiRanges = [
    [0x20, 0x7e], // Printable ASCII characters
    [0xa0, 0xff], // Extended ASCII characters
  ];

  // Check if a character code is within the WinAnsi range
  function isWinAnsi(charCode) {
    return winAnsiRanges.some(([start, end]) => charCode >= start && charCode <= end);
  }

  // Filter the text and replace non-WinAnsi characters with a space
  return Array.from(text)
    .map(char => {
      const charCode = char.charCodeAt(0);
      return isWinAnsi(charCode) ? char : ' ';
    })
    .join('');
}
