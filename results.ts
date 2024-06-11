
import { parse } from 'csv-parse';
import * as fs from 'fs';
import { stringify } from 'csv-stringify/sync';

const Parties = {
    C: 'Conservative Party',
    L: 'Labour Party',
    UKIP: 'UKIP',
    LD: 'Liberal Democrats',
    G: 'Green Party',
    Ind: 'Independent',
    SNP: 'SNP',
}

const parser = parse({ delimiter: ', '})
let rowCount = 0;
const errors: string[][] = []
const recordsOutput: string[][]= []

// read override file and store data in an object

type Overrides = {[key: string]: string[]}

async function getOverrides(): Promise<Overrides> {
    const overrides: Overrides = {}

    return new Promise((resolve, reject)  => {
        fs.createReadStream('input/overrides.csv')
        .pipe(parser)
        .on('data', (record: string[]) => {
            console.log(record);
            overrides[record[0]] = record.slice(1, record.length)
            console.log(record)
        })
        .on('error', (err) => {
            reject(err)
        })
        .end(() => {
            resolve(overrides)
        })
    })
}

async function createResults () {
    fs.createReadStream('input/results-input.csv')
        .pipe(parse({
            delimiter: ', '
          }))
        .on('data', (record: string[]) => {
            rowCount++
            // variable transformedRecord
            let processedRec = record
            const transformedRec: (string)[] = []
            let totalVotes = 0
            let inValidRow = false
        
            // validate constituent
            if (!validateConstituent(processedRec[0], rowCount, errors)) {
                inValidRow = true
                return false
            }
            // caluclate total votes for record
            for (let i =0; i<processedRec.length; i++) {
                const el = processedRec[i]
                if (i !== 0 && i%2 === 1) {
                    if (!validateScore(el, rowCount, errors)) {
                        inValidRow = true
                        break
                    }
                    totalVotes += parseInt(el)
                }
            }
        
            if (inValidRow) return
        
            // create record output
            for(let i =0; i< processedRec.length; i++) {
                if (i === 0) {
                    transformedRec[0] = processedRec[0]
                    continue
                }
        
                if (i%2 === 1 ) {
                    transformedRec[i] = ((parseInt(processedRec[i])/totalVotes)*100).toFixed(1)
                    continue
                }
        
                if (i%2 === 0) {
                    if (!validateParty(processedRec[i], rowCount, errors)) {
                        return false
                    }
                    transformedRec[i] = Parties[processedRec[i] as keyof typeof Parties]
                }
            }
        
            recordsOutput.push(transformedRec)
            
        })
        .on('end', () => {
            // write to results file
            const stringRes = stringify(recordsOutput);
            const stringErr = stringify(errors)
            fs.writeFile('output/results.csv', stringRes, 'utf-8', (err) => {
                if (err) console.log(err)
            })
        
            fs.writeFile('output/errors.csv', stringErr, 'utf-8', (err) => {
                if (err) console.log(err)
            })
        })
        .on('error', (err) => {
            console.log(err)
        })
    }


createResults()

// first el is empty string
// a score is empty/NaN
// a party does not exist in party map

function validateConstituent (el: string, row: number, errors: string[][]) {
    if (!el.length) {
        errors.push([`row ${row} has empty constituent`])
        return
    }
    return true
}

function validateScore(score: string, row: number, errors: string[][]) {
    if (isNaN(Number(score)) || score === '') {
        errors.push([`row ${row} has invalid score`])
        return
    }

    return true
}

function validateParty(party: string, row: number, errors: string[][]) {
    if (party in Parties) return true
    errors.push([`row ${row} has invalid party`])
    return
}