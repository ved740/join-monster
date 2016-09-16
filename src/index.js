import { nest } from 'nesthydrationjs'
const debug = require('debug')('join-monster')

import queryASTToSqlAST from './queryASTToSqlAST'
import stringifySqlAST from './stringifySqlAST'
import makeNestHydrationSpec from './makeNestHydrationSpec'
import { emphasize, inspect } from './util'


module.exports = (ast, dbCall) => {
  // we need to read the query AST and build a new "SQL AST" from which the SQL and
  // the spec for the Nest Hydration will be determined
  const sqlAST = queryASTToSqlAST(ast)
  debug(emphasize('SQL_AST'), inspect(sqlAST))

  // now convert the "SQL AST" to sql
  const sql = stringifySqlAST(sqlAST)
  debug(emphasize('SQL'), inspect(sql))

  // and generate the nest hydration spec
  const nestSpec = makeNestHydrationSpec(sqlAST)
  debug(emphasize('NEST_SPEC'), inspect(nestSpec))

  // are they using the callback interface? then lets wrap this in a promise
  if (dbCall.length === 2) {
    return new Promise((resolve, reject) => {
      dbCall(sql, (err, rows) => {
        if (err) {
          reject(err)
        } else {
          debug(emphasize('RAW'), inspect(rows))
          resolve(nest(rows, nestSpec))
        }
      })
    })
  }

  const result = dbCall(sql)
  // if their func gave us a promise for the data, wait for the data
  if (result.then) {
    return result.then(rows => {
      debug(emphasize('RAW DATA'), inspect(rows))
      return nest(rows, nestSpec)
    })
  // otherwise, they were supposed to give us the data directly
  } else {
    return Promise.resolve(nest(result, nestSpec))
  }
}
