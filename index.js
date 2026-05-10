'use strict'
const { DataApiClient } = require('rqlite-js')
const log = require('./logger')

const CACHE_HOSTS = process.env.REACTION_CACHE_URL || ['http://swgoh-cache-0.swgoh-cache-internal.datastore.svc.cluster.local:4001', 'http://swgoh-cache-1.swgoh-cache-internal.datastore.svc.cluster.local:4001', 'http://swgoh-cache-2.swgoh-cache-internal.datastore.svc.cluster.local:4001']
const NAME_SPACE = process.env.NAME_SPACE || 'default'
const dataApiClient = new DataApiClient(CACHE_HOSTS)
let TABLE_NAME = `allyCode_${NAME_SPACE.replace(/-/g, '_')}`, cache_ready

async function init(){
  try{
    let sql = `CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (allyCode TEXT PRIMARY KEY, playerId TEXT UNIQUE NOT NULL, discordId TEXT NOT NULL, type TEXT NOT NULL, uId TEXT, ttl INTEGER)`
    let dataResults = await dataApiClient.execute(sql)
    if(dataResults?.hasError()){
      log.error(dataResults?.getFirstError())
      return setTimeout(init, 5000)
    }
    cache_ready = true
    log.info(`create table ${TABLE_NAME}...`)
    return
  }catch(e){
    log.error(e)
    setTimeout(init, 5000)
  }
}
init()
async function get(key, value){
  try{
    if(!key || !value || !cache_ready) return
    let sql = `SELECT * FROM ${TABLE_NAME} where ${key}="${value?.toString()}"`
    let dataResults = await dataApiClient.query(sql)
    if(dataResults.hasError()){
      log.error(dataResults?.getFirstError())
      return
    }
    return dataResults?.toArray()
  }catch(e){
    log.error(e)
  }
}
async function set({ allyCode, playerId, discordId, type, uId }){
  try{
    if(!allyCode || !cache_ready) return

    let sql_start = `INSERT OR REPLACE INTO ${TABLE_NAME} ( allyCode`, sql_values = 'VALUES(:allyCode'
    if(playerId){
      sql_start += `, playerId`
      sql_values += `, :playerId`
    }
    if(discordId){
      sql_start += `, discordId`
      sql_values += `, :discordId`
    }
    if(type){
      sql_start += `, type`
      sql_values += `, :type`
    }
    if(uId){
      sql_start += `, uId`
      sql_values += `, :uId`
    }
    let sql = [
      [`${sql_start}, ttl) ${sql_values}, ${Date.now()}`, { allyCode: allyCode?.toString(), playerId, discordId: discordId?.toString(), type, uId }]
    ]
    let dataResults = await dataApiClient.execute(sql)
    if(dataResults?.hasError()){
      log.error(dataResults?.getFirstError())
      return setTimeout(init, 5000)
    }
    if(dataResults?.get(0)?.getLastInsertId() > 0) return true
  }catch(e){
    log.error(e)
  }
}
async function update(allyCode, key, value){
  try{
    if(!allyCode || !key || !value || !cache_ready) return
    let sql = `UPDATE ${TABLE_NAME} SET ${key}="${value?.toString()}" WHERE allyCode="${allyCode?.toString()}"`
    let dataResults = await dataApiClient.execute(sql)
    if(dataResults?.hasError()){
      log.error(dataResults?.getFirstError())
      return setTimeout(init, 5000)
    }
    if(dataResults?.get(0)?.getLastInsertId() > 0) return true
  }catch(e){
    log.error(e)
  }
}
async function del(allyCode){
  try{
    if(!allyCode || !cache_ready) return
    let sql = `DELET FROM ${TABLE_NAME} WHERE allyCode="${allyCode?.toString()}"`
    let dataResults = await dataApiClient.execute(sql)
    if(dataResults?.hasError()){
      log.error(dataResults?.getFirstError())
      return setTimeout(init, 5000)
    }
    if(dataResults?.get(0)?.getLastInsertId() > 0) return true
  }catch(e){
    log.error(e)
  }
}
