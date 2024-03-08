import * as csvToJson from 'csvtojson'
import { join } from 'path'

//
// Data schema
//

interface IWorkbook {
  Name: string
  Address: string
  Postcode: string
  Phone: string
  "Credit Limit": number
  Birthday: string
}

const colParser = {
  Name: 'string',
  Address: 'string',
  Postcode: 'string',
  Phone: 'string',
  "Credit Limit": 'number',
  Birthday: 'string'
}

function streamToString (stream: NodeJS.ReadWriteStream): Promise<string> {
  const chunks: any[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk, 'latin1')));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  })
}


async function readCSV (raw: string): Promise<IWorkbook[]> {
  return await new Promise((resolve, reject) => {
    void csvToJson({ checkColumn: true, colParser, headers: Object.keys(colParser), ignoreEmpty: true })
      .fromString(raw)
      .on('error', (error) => {
        reject(error)
      })
      .then(json => {
        resolve(json)
      })
  })
}

function getColumnSizes (titleLine: string): number[] {
  const columnSizes: number[] = []

  for (const title of Object.keys(colParser)) {
    const startPos = titleLine.indexOf(title)
    if (startPos === -1) {
      console.error(`Column "${title}" not found`)
      process.exit(1)
    }

    const endPos = titleLine.indexOf(Object.keys(colParser)[Object.keys(colParser).indexOf(title) + 1], startPos)
    if (endPos !== -1) {
      columnSizes.push(endPos - startPos)
    } else {
      columnSizes.push(titleLine.length - startPos)
    }
  }

  return columnSizes;
}

function parseDate (raw: string): string {
  return `${raw.substring(6, 8)}/${raw.substring(4, 6)}/${raw.substring(0, 4)}`
}

async function readPRN (raw: string): Promise<IWorkbook[]> {
  const rawLines = raw.split('\r\n')

  // first line determines the column sizes
  let colSizes: number[] = getColumnSizes(rawLines[0])
  let colStarts: number[] = []
  let colEnds: number[] = []
  for (const size of colSizes) {
    colStarts.push(colEnds[colEnds.length - 1] || 0)
    colEnds.push(colStarts[colStarts.length - 1] + size)
  }

  const records: IWorkbook[] = []
  for (let i = 1; i < rawLines.length; i++) {
    if (rawLines[i].length === 0) continue

    const line = rawLines[i]
    records.push({
      Name: line.substring(colStarts[0], colEnds[0]).trim(),
      Address: line.substring(colStarts[1], colEnds[1]).trim(),
      Postcode: line.substring(colStarts[2], colEnds[2]).trim(),
      Phone: line.substring(colStarts[3], colEnds[3]).trim(),
      "Credit Limit": Number(line.substring(colStarts[4], colEnds[4]).trim()) / 100,
      Birthday: parseDate(line.substring(colStarts[5], colEnds[5]).trim())
    })
  }

  return records
}

async function writeJSON (records: IWorkbook[]): Promise<void> {
  console.log(JSON.stringify(records))
}

async function writeHTML (records: IWorkbook[]): Promise<void> {
  console.log('<!DOCTYPE html>')
  console.log('<html>')
  console.log('<body>')
  console.log('<table>')
  console.log('<tr>')
  Object.keys(colParser).forEach(key => console.log(`<th>${key}</th>`))
  console.log('</tr>')
  records.forEach(record => {
    Object.keys(record).forEach(key => {
      console.log(`<td>${record[key as keyof IWorkbook]}</td>`)
    })
  });
  console.log('</table>')
  console.log('</body>')
  console.log('</html>')
}

async function main(): Promise<void> {

  //
  // Input validation
  //

  if (process.argv.length !== 4) {
    console.error('Usage: main [csv|prn] [json|html]')
    process.exit(1)
  }

  const inFormat = process.argv[2];
  if (inFormat !== 'csv' && inFormat !== 'prn') {
    console.error('Invalid input format, must be csv or prn')
    process.exit(1)
  }

  const outFormat = process.argv[3];
  if (outFormat !== 'json' && outFormat !== 'html') {
    console.error('Invalid output format, must be json or html')
    process.exit(1)
  }

  //
  // Input stream
  //

  const raw = await streamToString(process.stdin.setEncoding('latin1'))

  let records: IWorkbook[] = []
  if (inFormat === 'csv') {
    records = await readCSV(raw)
  } else {
    records = await readPRN(raw)
  }

  //
  // Output stream
  //

  if (outFormat === 'json') {
    await writeJSON(records)
  } else {
    await writeHTML(records)
  }
  
}

main()