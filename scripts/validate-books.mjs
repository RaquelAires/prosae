import fs from 'node:fs';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
for (const name of fs.readdirSync('public/samples')) {
  if (name.endsWith('.epub')) {
    const zip = await JSZip.loadAsync(fs.readFileSync('public/samples/' + name));
    assert.equal(await zip.file('mimetype').async('text'), 'application/epub+zip');
    assert(zip.file('META-INF/container.xml'));
    assert(zip.file('OEBPS/c2.xhtml'));
  }
  if (name.endsWith('.pdf')) {
    const doc = await getDocument({ data: new Uint8Array(fs.readFileSync('public/samples/' + name)), useSystemFonts: true }).promise;
    assert.equal(doc.numPages, 3);
    const text = await (await doc.getPage(1)).getTextContent();
    const extracted = text.items.map(item => 'str' in item ? item.str : '').join(' ');
    assert(extracted.length > 150);
    assert(extracted.includes('Capitulo 1'));
    await doc.destroy();
  }
}
console.log('PDFs válidos com três páginas e texto; EPUBs válidos com manifestos e capítulos.');
