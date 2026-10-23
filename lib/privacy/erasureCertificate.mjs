import { createHash } from 'node:crypto'

function pdfEscape(value) {
  return String(value).replace(/[^\x20-\x7e]/g, '?').replace(/[\\()]/g, '\\$&')
}

function buildPdf(lines) {
  const content = [
    'BT',
    '/F1 18 Tf',
    '50 790 Td',
    `(${pdfEscape(lines[0])}) Tj`,
    '/F1 10 Tf',
    ...lines.slice(1).flatMap((line) => ['0 -24 Td', `(${pdfEscape(line)}) Tj`]),
    'ET',
  ].join('\n')
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content, 'ascii')} >>\nstream\n${content}\nendstream`,
  ]
  let document = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(document, 'ascii'))
    document += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xrefOffset = Buffer.byteLength(document, 'ascii')
  document += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets.slice(1)) document += `${String(offset).padStart(10, '0')} 00000 n \n`
  document += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  return Buffer.from(document, 'ascii')
}

/** A minimal, identity-free completion record derived only from terminal receipts. */
export function generateErasureCertificate(caseDoc) {
  if (!caseDoc || !['completed', 'retained_exception'].includes(caseDoc.state)) {
    const error = new Error('A completion certificate is available only after every required target is terminal.')
    error.status = 409
    error.code = 'erasure_case_not_terminal'
    throw error
  }
  const targetEntries = Object.entries(caseDoc.targets || {}).sort(([a], [b]) => a.localeCompare(b))
  const evidenceDigest = createHash('sha256')
    .update(JSON.stringify(targetEntries.map(([target, receipt]) => ({
      target,
      status: receipt.status,
      updatedAt: receipt.updatedAt || null,
      reasonCode: receipt.reasonCode || null,
      evidence: receipt.evidence || null,
    }))))
    .digest('hex')
  const lines = [
    'Personal data erasure record',
    `Case reference: ${caseDoc.requestId}`,
    `Case outcome: ${caseDoc.state}`,
    `Request received: ${new Date(caseDoc.receivedAt).toISOString()}`,
    `Record issued: ${new Date(caseDoc.updatedAt || caseDoc.receivedAt).toISOString()}`,
    'System receipts:',
    ...targetEntries.map(([target, receipt]) => `${target}: ${receipt.status}; ${receipt.updatedAt ? new Date(receipt.updatedAt).toISOString() : 'time not recorded'}${receipt.reasonCode ? `; reason ${receipt.reasonCode}` : ''}`),
    `Receipt-set SHA-256: ${evidenceDigest}`,
    caseDoc.state === 'completed'
      ? 'All required targets reported terminal deletion or no matching record.'
      : 'One or more targets were retained by an authorized exception; this is not a full-deletion claim.',
    'This record contains no requester identity, email address, provider ID, or image.',
  ]
  return buildPdf(lines)
}
