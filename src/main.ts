import * as csvToJson from 'csvtojson'
import { Readable } from 'stream'

interface IWorkbook {
  Name: string
  Address: string
  Postcode: string
  Phone: string
  CreditLimit: number
  Birthday: Date
}

const colParser = {
  Name: 'string',
  Address: 'string',
  Postcode: 'string',
  Phone: 'string',
  CreditLimit: 'number',
  Birthday: 'date'
}

async function readCSV (inputStream: Readable): Promise<IWorkbook[]> {
  return await new Promise((resolve, reject) => {
    void csvToJson({ checkColumn: true, colParser, headers: Object.keys(colParser), ignoreEmpty: true })
      .fromStream(inputStream)
      .on('error', (error) => {
        reject(error)
      })
      .then(json => {
        resolve(json)
      })
  })
}

async function writeJSON (records: IWorkbook[]): Promise<void> {
  console.log(JSON.stringify(records))
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

  const inputStream = process.stdin
  let records: IWorkbook[] = []

  if (inFormat === 'csv') {
    records = await readCSV(inputStream)
    console.log(records)
  } else {
    console.log('PRN input not implemented')
  }

  //
  // Output stream
  //

  if (outFormat === 'json') {
    await writeJSON(records)
  } else {
    console.log('HTML output not implemented')
  }
  
}

main()