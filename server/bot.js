const TCONSTS = require('./TherapistConsts')


// const =CronTime = cron.sendAt
const Extra = require('telegraf/extra')
const ObjectId = require('mongodb').ObjectId;
const Markup = require('telegraf/markup');
const Telegraf = require('telegraf')
const TelegrafInlineMenu = require('telegraf-inline-menu')

module.exports = (app) => {



  // ! THERAPIST BOT ----------------------------------------------------------------------------------------------------


  const createExcel = require('./CreateExcel');


  // Will be used in code
  let action;
  let patient;
  let PatientsArr = [];
  let therapistNote;
  let allMyPatients;
  let toRows;

  //Defined the bot
  const bot = new Telegraf(process.env.THERAPIST_TOKEN);


  //The commands we have
  bot.start((ctx) => ctx.reply(TCONSTS.START_MESSAGE))
  bot.help((ctx) => ctx.reply(TCONSTS.HELP_MESSAGE))



  //  When the dialogs is updating - the pationt get / send message.
  app.models.Dialogs.observe('after save', async function (ctx) {
    if (ctx.instance && ctx.instance.managerAlert && ctx.instance.managerAlert.case === 'NEVER') {
      return;
    }

    if (ctx.instance && ctx.instance.managerAlert &&
      (ctx.instance.managerAlert.case === 'DIDNT_ANSWER' || ctx.instance.managerAlert.case === 'CRITICAL') && ctx.instance.chat &&
      (ctx.instance.chat[ctx.instance.chat.length - 1]['reactionType'] === 'DIDNT_ANSWER' || ctx.instance.chat[ctx.instance.chat.length - 1]['reactionType'] === 'CRITICAL')
    ) {

      let timeout = ctx.instance.managerAlert.timeout;
      timeout = timeout * 60000 

      setTimeout(async () => {
        let currentDialog = await app.models.Dialogs.find({ where: { id: ObjectId(ctx.instance.id) } })
        if (currentDialog[0].managerAlert && (currentDialog[0].managerAlert.case === 'DIDNT_ANSWER' || currentDialog[0].managerAlert.case === 'CRITICAL') && currentDialog[0].chat && (currentDialog[0].chat[ctx.instance.chat.length - 1]['reactionType'] === 'DIDNT_ANSWER' || currentDialog[0].chat[ctx.instance.chat.length - 1]['reactionType'] === 'CRITICAL')) {
          managerAlert(ctx, currentDialog[0].managerAlert.case)
        }
      }, timeout)
    }
  })

  async function managerAlert(ctx, type) {

    let PatientsData = await app.models.Patients.find({ where: { id: ObjectId(ctx.instance.patientId) }, fields: { therapistId: true, firstName: true, lastName: true } })
    let therapistId = PatientsData[0].therapistId
    let telegranIdOfTherapist = await app.models.CustomUser.find({ where: { id: therapistId }, fields: { telegramId: true } });
    let criticalConditionPatientName = `${PatientsData[0].firstName} ${PatientsData[0].lastName}`;
    let theMessage = `${ctx.instance.chat[ctx.instance.chat.length - 1].questionText}`;
    let theAnswer = `${ctx.instance.chat[ctx.instance.chat.length - 1].patientAnswer}`;

    if (type === 'CRITICAL') {
      bot.telegram.sendMessage(telegranIdOfTherapist[0].telegramId, `שים לב ❤ למצב המטופל ${criticalConditionPatientName}.
נשלחה אליו ההודעה: "${theMessage}"
והוא הגיב: "${theAnswer}"`)
    } else if (type === 'DIDNT_ANSWER') {
      bot.telegram.sendMessage(telegranIdOfTherapist[0].telegramId, `שים לב ❤ למצב המטופל ${criticalConditionPatientName}.
נשלחה אליו ההודעה: "${theMessage}"
לפני ${ctx.instance.managerAlert.timeout} דקות והוא עדיין לא הגיב.`)
    }
  }




  //Active Array - what the THERAPIST can do
  let optionalActivesArr = [];
  for (let i = 0; i < TCONSTS.OPTIONAL_ACTIVES.length; i++) {
    optionalActivesArr.push(TCONSTS.OPTIONAL_ACTIVES[i].TEXT)
  }

  //ON AMIGO -> the key word - ask to select action
  bot.hears(TCONSTS.KEY_WORD, async (ctx) => {

    let telegramId = ctx.update.message.from.id;
    let isNewUser = await app.models.CustomUser.logIn(telegramId, ctx.update.message.text)//checking if the user exists db
    if (isNewUser.res === 0) { //if the user is assigned

      let TherapistData = await app.models.CustomUser.find({ where: { telegramId: ctx.update.message.from.id.toString() }, fields: { username: true, id: true, therapistId: true } })
      if (TherapistData.length > 0) {
        allMyPatients = await app.models.Patients.find({ where: { therapistId: TherapistData[0].id }, fields: { id: true, firstName: true, lastName: true } });
        for (let i = 0; i < allMyPatients.length; i++) {
          if (!PatientsArr.includes(`${allMyPatients[i].firstName} ${allMyPatients[i].lastName}`)) {
            PatientsArr.push(`${allMyPatients[i].firstName} ${allMyPatients[i].lastName}`)
          }
        }
        console.log('ya?')
        ctx.reply(TCONSTS.FIRST_QUESTION, Markup.keyboard(optionalActivesArr)
          .oneTime()
          .resize()
          .extra()
        )
      } else {
        ctx.reply('חלה תקלה. אנא פנה למנהל המערכת. ')
      }
    }
  }
  )

  // After select active - open in Keyboard to select patient
  for (let i = 0; i < TCONSTS.OPTIONAL_ACTIVES.length; i++) {
    bot.hears(TCONSTS.OPTIONAL_ACTIVES[i].TEXT, (ctx) => {
      action = ctx.match;
      return ctx.reply(`בחרת ב${action}
${TCONSTS.SELECT_PATIENT}`, Markup.keyboard(PatientsArr)
          .oneTime()
          .resize()
          .extra()
      )
    })
  }


  // Receives each message and handles it accordingly
  bot.on('message', async (ctx) => {

    let telegramId = ctx.update.message.from.id;
    let isNewUser = await app.models.CustomUser.logIn(telegramId, ctx.update.message.text)//checking if the user exists db
    if (isNewUser.res === 0) { //if the user is assigned

      // Have patient && action - cause therapist selected
      if (PatientsArr.includes(ctx.update.message.text) && action !== undefined) {
        let workbook;
        patient = ctx.update.message.text

        if (action === TCONSTS.OPTIONAL_ACTIVES[0].TEXT) { // Updating
          ctx.reply(`בחרת ב${action}
עבור המטופל ${patient}
אנא שלח את תוכן העדכון בהודעה הבאה`)
        }

        else if (action === TCONSTS.OPTIONAL_ACTIVES[1].TEXT || action === TCONSTS.OPTIONAL_ACTIVES[2].TEXT) { // Send a report

          let findPatient = allMyPatients.filter((singlePatient) => {
            return `${singlePatient.firstName} ${singlePatient.lastName}` === patient;
          })

          var oldDate = new Date();

          if (TCONSTS.OPTIONAL_ACTIVES[1].TEXT === action) {
            oldDate.setHours(01);
          }
          if (TCONSTS.OPTIONAL_ACTIVES[2].TEXT === action) {
            oldDate.setDate(oldDate.getDate() - 7);
          }

          toRows = await app.models.Dialogs.find({
            where: {
              patientId: ObjectId(findPatient[0].id), created: {
                gte: oldDate, //yesterday OR a week ago
                lt: new Date()  //today
              }
            }, fields: { therapistNote: true, snoozeNumber: true, chat: true, created: true }
          })

          // Create an excel file and send the data for if - "toRow"
          workbook = createExcel(toRows)
          workbook.then((result) => {
            result.xlsx.writeBuffer().then(async (buffer) => {
              ctx.reply(`בחרת ב${action}
עבור המטופל ${patient}`)
              await ctx.replyWithDocument({ source: buffer, filename: "דוח על המטופל.xlsx" });
              action = undefined;
            });
          })
        }
      }

      // Update message content on patient - if i have patient && action === updating => it is the message.
      else if (patient !== undefined && action === TCONSTS.OPTIONAL_ACTIVES[0].TEXT) {
        therapistNote = ctx.update.message.text;
        ctx.reply(`נקלטה ההודה:
${ctx.update.message.text}
לשמור את ההודעה?`, Markup.inlineKeyboard([
            [Markup.callbackButton('כן', 'update'),
            Markup.callbackButton('לא', 'cancel')],
          ]).resize().extra());

        bot.action('update', async (ctx) => {

          try {
            let findPatient = allMyPatients.filter((singlePatient) => {
              return `${singlePatient.firstName} ${singlePatient.lastName}` === patient;
            })
            let newTherapistNote = {
              'patientId': findPatient[0].id,
              'therapistNote': therapistNote,
              'status': 'NOTE',
              'snoozeNumber': 0,
              'created': new Date()
            }
            await app.models.Dialogs.create(newTherapistNote)
            ctx.editMessageText('🎉 העדכון נשלח בהצלחה! 🎉')
          } catch (err) {
            ctx.editMessageText('משהו השתבש...נסה שוב מאוחר יותר')
            console.log('ERR: ', err)
            return err;
          }

          action = undefined; patient = undefined; therapistNote = '' // delete data

        })

        bot.action('cancel', (ctx) => {
          ctx.editMessageText('עדכון המידע על המטופל בוטל')
          action = undefined; patient = undefined; // delete data          
        })
      }

      // Every msg that the bot dosen't know to deal with
      else {
        ctx.reply(TCONSTS.UNKNOWN_TEXT)
      }
    }
  })

  bot.launch()
}



const msgs = [
  {
    id: 1,
    text: "מה קורה",
    telegramId: "1082649949",
    time: "15:15",
    optionalAnswers: [{
      "text": "חרא",
      "reactionType": "1",
      "nextQuestionId": 2
    },
    {
      "text": "סביר",
      "reactionType": "2",
      "nextQuestionId": 'מקווה שישתפר'

    },
    {
      "text": "טוב",
      "reactionType": "3",
      "nextQuestionId": 'שיהיה המשך יום קסום'

    }
    ]
  },
  {
    id: 2,
    text: "למה",
    telegramId: "1082649949",
    time: "13:51",
    optionalAnswers: [{
      "text": "כי ענבל השפריצה עליי",
      "reactionType": "1",
      "nextQuestionId": 3
    },
    {
      "text": "כי הבאג לא נפתר",
      "reactionType": "2",
      "nextQuestionId": '👍'

    }
    ]
  }, {
    id: 3,
    text: "אולי",
    telegramId: "1082649949",
    time: "13:51",
    optionalAnswers: [
      {
        "text": "שיהיה",
        "reactionType": "1",
        "nextQuestionId": '👍'
      },
      {
        "text": "אוקי",
        "reactionType": "2",
        "nextQuestionId": '1'

      },
      {
        "text": "סבבה",
        "reactionType": "3",
        "nextQuestionId": '2'

      }
    ]
  }
]