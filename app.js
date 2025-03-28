'use strict';

//------モジュールスコープ変数s--------
  var
    keys     = require('./lib/keys'),
    fs       = require('fs'),
    express  = require('express'),
    app      = express(),
    router   = express.Router(),
    http     = require('https').createServer({
      key  : fs.readFileSync(keys.privkeyFilePath),
      cert : fs.readFileSync(keys.certFilePath)
    }, app ),
    io       = require('socket.io')( http ),
    crypt    = require('./lib/crypt'),
    db       = require('./lib/database'),
    utils    = require('./lib/util_s'),
    port     = 3001;

//------モジュールスコープ変数e--------

//------ユーティリティメソッドs--------
io.on("connection", function (socket) {
  // 単に取得するだけの処理はまとめておく
  // ログインなど特殊なのは別処理
  let commonDBFind = function (msg, collectionName, resultMessageName) {

    // アクセスキーの確認のために'user'にアクセスしている
    db.findManyDocuments('user', {userId:msg.AKey.userId}, {projection:{_id:0}}, function (result) {
      // ログイン中のユーザにのみ回答
      if (result.length != 0 && msg.AKey.token == result[0].token ) {
        db.findManyDocuments(collectionName, msg.SKey, {projection:{_id:0}}, function (res) {
          let obj = {res         : res,
                     clientState : msg.clientState};
          //console.log('findDocuments done');
          io.to(socket.id).emit(resultMessageName, obj); // 送信者のみに送信
        });
      } else {
        // ここにアナザーログインを実装すること
        io.to(socket.id).emit('anotherLogin', {}); // 送信者のみに送信
      }
    });
  };

  socket.on('tryLogin', function (msg) {
    db.findManyDocuments('user', {userId:msg.userId}, {projection:{_id:0}}, function (result) {
      if (result.length != 0) {
        crypt.compare(msg.passWord, result[0].passWord, function (res) {
          //パスワードが一致
          if (res) {
            let token = String(Math.random()).slice(2,12);

            //お手軽なランダム文字列をトークンとして設定し、ログイン状態とする
            db.updateDocument('user', {userId:msg.userId}, {$set:{token:token}}, function (res) {
              io.to(socket.id).emit('loginResult', {result   : true,
                                                    userId   : msg.userId,
                                                    token    : token,
                                                    userKind : result[0].userKind,
                                                    name     : result[0].name,
                                                    jyugyou  : result[0].jyugyou,
                                                    jikanwari: result[0].jikanwari}); // 送信者のみに送信
            });

          //パスワードが違う
          } else {
            io.to(socket.id).emit('loginResult', {result: false}); // 送信者のみに送信
          }
        });
      // 該当ユーザがいない
      } else {
        io.to(socket.id).emit('loginResult', {result: false}); // 送信者のみに送信
      }
    });
  });

  socket.on('tryLogout', function (msg) {
    db.findManyDocuments('user', {userId:msg.userId}, {projection:{_id:0}}, function (result) {
      if (result.length != 0) {
        //トークンを空文字列とし、ログアウト状態とする
        db.updateDocument('user', {userId:msg.userId}, {$set:{token:""}}, function (res) {
          io.to(socket.id).emit('logoutResult', {result: true}); // 送信者のみに送信
        });
      // 該当ユーザがいない
      } else {
        io.to(socket.id).emit('logoutResult', {result: false}); // 送信者のみに送信
      }
    });
  });

  socket.on('getClassMeibo', function (msg) {
//    console.log("getClassMeibo");

    commonDBFind(msg, 'class', 'getClassMeiboResult');
  });

  socket.on('getAllMeibo', function (msg) {
//    console.log("getAllMeibo");

    commonDBFind(msg, 'class', 'getAllMeiboResult');
  });

  socket.on('readyCalendar', function (msg) {
//    console.log("readyCalendar");
    // ユーザ全員が必要とする情報だから、皆最初に取ってる。
    // 元はカレンダーのみ取得する処理だったが、何度もやりとりを往復すると
    // 遅くなりそうなのを気にして休学データを追加する際に、ここにぶっ込んだ。
    // 分かりにくい気がするので設計としてはどうかと思う。
    db.findManyDocuments('user', {userId:msg.AKey.userId}, {projection:{_id:0}}, function (result) {
      if (result.length != 0 && msg.AKey.token == result[0].token ) {
        db.findManyDocuments('calendar', {}, {projection:{_id:0}}, function (resu) {
          db.findManyDocuments('kyuugaku', {}, {projection:{_id:0}}, function (res) {
            let obj = {calendar:resu, kyuugaku:res, clientState:msg.clientState};
            io.to(socket.id).emit('readyCalendarResult', obj); // 送信者のみに送信
          });
        });
      } else {
        io.to(socket.id).emit('anotherLogin', {}); // 送信者のみに送信
      }
    });
  });

  socket.on('getKekka', function (msg) {
//    console.log("getKekka");

    commonDBFind(msg, 'kekka', 'getKekkaResult');
  });

  socket.on('getGoudouMeibo', function (msg) {
//    console.log("getGoudouMeibo");

    commonDBFind(msg, 'goudouMeibo', 'getGoudouMeiboResult');
  });

  socket.on('getStudentMemo', function (msg) {
//    console.log("getStudentMemo");

    commonDBFind(msg, 'studentMemo', 'getStudentMemoResult');
  });

  socket.on('getAllGoudouMeibo', function (msg) {
//    console.log("getAllGoudouMeibo");

    commonDBFind(msg, 'goudouMeibo', 'getAllGoudouMeiboResult');
  });

  socket.on('getSyukketsu', function (msg) {
//    console.log("getSyukketsu");
    // アクセスキーの確認のために'user'にアクセスしている
    db.findManyDocuments('user', {userId:msg.AKey.userId}, {projection:{_id:0}}, function (result) {
      // ログイン中のユーザにのみ回答
      if (result.length != 0 && msg.AKey.token == result[0].token ) {
        db.findManyDocuments('syukketsu', msg.SKey, {projection:{_id:0}}, function (resu) {
          db.findManyDocuments('renraku', msg.SKey, {projection:{_id:0}}, function (res) {
            let obj = {syukketsu:resu, renraku:res, clientState:msg.clientState};
            io.to(socket.id).emit('getSyukketsuResult', obj); // 送信者のみに送信
          });
        });
      } else {
        io.to(socket.id).emit('anotherLogin', {}); // 送信者のみに送信
      }
    });
  });



  socket.on('updateSyukketsu', function (msg) {
    /*
    let i;
    console.log("* * updateSyukketsu * *");
    console.log("gakunen:" + msg.syukketsuData.gakunen);
    console.log("cls:"     + msg.syukketsuData.cls);
    console.log("month:"   + msg.syukketsuData.month);
    console.log("day:"     + msg.syukketsuData.day);
    console.log("member:");
    for (i = 0; i < msg.syukketsuData.member.length; i++) {
      console.log(msg.syukketsuData.member[i]);
    }*/

    db.findManyDocuments('user', {userId:msg.AKey.userId}, {projection:{_id:0}}, function (result) {
      // ログイン中のユーザにのみ回答
      if (result.length != 0 && msg.AKey.token == result[0].token ) {
        db.updateDocument('syukketsu',
                          {gakunen : msg.syukketsuData.gakunen,
                           cls     : msg.syukketsuData.cls,
                           month   : msg.syukketsuData.month,
                           day     : msg.syukketsuData.day},
                          {$set : {gakunen : msg.syukketsuData.gakunen,
                                   cls     : msg.syukketsuData.cls,
                                   year    : msg.syukketsuData.year,
                                   month   : msg.syukketsuData.month,
                                   day     : msg.syukketsuData.day,
                                   member  : msg.syukketsuData.member}}, function (res) {

          //console.log('updateSyukketsu done' + res);
          io.to(socket.id).emit('updateSyukketsuResult', res); // 送信者のみに送信
        });
      } else {
        io.to(socket.id).emit('anotherLogin', {}); // 送信者のみに送信
      }
    });
  });

  socket.on('insertRenraku', function (msg) {
    /*
    console.log("* * insertRenraku * *");
    console.log("gakunen:" + msg.renrakuData.gakunen);
    console.log("cls:"     + msg.renrakuData.cls);
    console.log("month:"   + msg.renrakuData.month);
    console.log("day:"     + msg.renrakuData.day);
    console.log("name:"     + msg.renrakuData.name);
    */
    db.findManyDocuments('user', {userId:msg.AKey.userId}, {projection:{_id:0}}, function (result) {
      // ログイン中のユーザにのみ回答
      if (result.length != 0 && msg.AKey.token == result[0].token ) {
        db.insertDocument('renraku',
                          msg.renrakuData,
                          function (res) {

          //console.log('insertRenrakuResult done' + res);
          io.to(socket.id).emit('insertRenrakuResult', res); // 送信者のみに送信
        });
      } else {
        io.to(socket.id).emit('anotherLogin', {}); // 送信者のみに送信
      }
    });
  });

  socket.on('deleteRenraku', function (msg) {
    /*
    console.log("* * deleteRenraku * *");
    console.log("gakunen:" + msg.SKey.gakunen);
    console.log("cls:"     + msg.SKey.cls);
    console.log("bangou:"  + msg.SKey.bangou);
    console.log("month:"   + msg.SKey.month);
    console.log("day:"     + msg.SKey.day);
    */
    db.findManyDocuments('user', {userId:msg.AKey.userId}, {projection:{_id:0}}, function (result) {
      // ログイン中のユーザにのみ回答
      if (result.length != 0 && msg.AKey.token == result[0].token ) {
        db.deleteManyDocuments('renraku',
                               msg.SKey,
                               function (res) {

          //console.log('insertRenrakuResult done' + res);
          io.to(socket.id).emit('deleteRenrakuResult', res); // 送信者のみに送信
        });
      } else {
        io.to(socket.id).emit('anotherLogin', {}); // 送信者のみに送信
      }
    });
  });

  socket.on('changePass', function (msg) {
    db.findManyDocuments('user', {userId:msg.AKey.userId}, {projection:{_id:0}}, function (result) {
      // ログイン中のユーザにのみ回答
      if (result.length != 0 && msg.AKey.token == result[0].token ) {
        crypt.compare(msg.oldPass, result[0].passWord, function (res) {
          //今のパスワードが一致
          if (res) {
            crypt.hash(msg.newPass,function (hashstr) {
              db.updateDocument('user', {userId:msg.AKey.userId},
                                {$set:{passWord:hashstr}}, function (resul) {
                console.log('pass change done');
                io.to(socket.id).emit('changePassResult', {result: true}); // 送信者のみに送信
              });
            });

          //今のパスワードが違う
          } else {
            io.to(socket.id).emit('changePassResult', {result: false}); // 送信者のみに送信
          }
        });
      } else {
        io.to(socket.id).emit('anotherLogin', {}); // 送信者のみに送信
      }
    });
  });

  socket.on('updateCalendar', function (msg) {
    db.findManyDocuments('user', {userId:msg.AKey.userId}, {projection:{_id:0}}, function (result) {
      // ログイン中のユーザにのみ回答
      if (result.length != 0 && msg.AKey.token == result[0].token ) {
        let i, sKey,
            num = msg.updateData.length,
            progress = 0;

        for (i = 0; i < num; i++) {
          sKey = {year  : msg.updateData[i].year,
                  month : msg.updateData[i].month,
                  day   : msg.updateData[i].day};

          if (msg.updateData[i].nikka == "") {
            db.deleteManyDocuments('calendar',
                                   sKey,
                                   function (res) {
              progress++;
              if (progress == num) {
                io.to(socket.id).emit('updateCalendarResult', res); // 送信者のみに送信
              }
            });
          } else {
            db.updateDocument('calendar',
                              sKey,
                              {$set:{nikka  : msg.updateData[i].nikka,
                                     gyouji : msg.updateData[i].gyouji}},
                              function (res) {
              progress++;
              if (progress == num) {
                io.to(socket.id).emit('updateCalendarResult', res); // 送信者のみに送信
              }
            });
          }
        }
      } else {
        io.to(socket.id).emit('anotherLogin', {}); // 送信者のみに送信
      }
    });
  });

  socket.on('updateJikanwari', function (msg) {
    db.findManyDocuments('user', {userId:msg.AKey.userId}, {projection:{_id:0}}, function (result) {
      // ログイン中のユーザにのみ回答
      if (result.length != 0 && msg.AKey.token == result[0].token ) {
        db.updateDocument('user',
                          {userId : msg.AKey.userId},
                          {$set : {jikanwari : msg.jikanwariData}},
                          function (res) {

          //console.log('updateSyukketsu done' + res);
          io.to(socket.id).emit('updateJikanwariResult', res); // 送信者のみに送信
        });
      } else {
        io.to(socket.id).emit('anotherLogin', {}); // 送信者のみに送信
      }
    });
  });

  socket.on('updateJyugyou', function (msg) {
    /*let i;
    console.log("* * updateJyugyou * *");
    for (i = 0; i < msg.jikanwariData.length; i++) {
      console.log("nikka:"     + msg.jikanwariData[i].nikka);
      console.log("youbi:"     + msg.jikanwariData[i].youbi);
      console.log("koma:"      + msg.jikanwariData[i].koma);
      console.log("jyugyouId:" + msg.jikanwariData[i].jyugyouId);
    }*/

    db.findManyDocuments('user', {userId:msg.AKey.userId}, {projection:{_id:0}}, function (result) {
      // ログイン中のユーザにのみ回答
      if (result.length != 0 && msg.AKey.token == result[0].token ) {
        db.updateDocument('user',
                          {userId : msg.AKey.userId},
                          {$set : {jyugyou : msg.jyugyouData}},
                          function (res) {

          //console.log('updateSyukketsu done' + res);
          io.to(socket.id).emit('updateJyugyouResult', res); // 送信者のみに送信
        });
      } else {
        io.to(socket.id).emit('anotherLogin', {}); // 送信者のみに送信
      }
    });
  });

  socket.on('updateKekka', function (msg) {
    /*let i;
    console.log("* * updateKekka * *");
    for (i = 0; i < msg.jikanwariData.length; i++) {
      console.log("nikka:"     + msg.jikanwariData[i].nikka);
      console.log("youbi:"     + msg.jikanwariData[i].youbi);
      console.log("koma:"      + msg.jikanwariData[i].koma);
      console.log("jyugyouId:" + msg.jikanwariData[i].jyugyouId);
    }*/

    db.findManyDocuments('user', {userId:msg.AKey.userId}, {projection:{_id:0}}, function (result) {
      // ログイン中のユーザにのみ回答
      if (result.length != 0 && msg.AKey.token == result[0].token ) {
        db.updateDocument('kekka',
                          {userId : msg.AKey.userId,
                           year   : msg.year,
                           month  : msg.month,
                           day    : msg.day,
                           koma   : msg.koma},
                          {$set   : {state     : msg.state,
                                     contents  : msg.contents,
                                     jyugyouId : msg.jyugyouId,
                                     memo      : msg.memo}},
                          function (res) {

          //console.log('updateKekka done' + res);
          io.to(socket.id).emit('updateKekkaResult', res); // 送信者のみに送信
        });
      } else {
        io.to(socket.id).emit('anotherLogin', {}); // 送信者のみに送信
      }
    });
  });

  socket.on('updateStudentMemo', function (msg) {
    db.findManyDocuments('user', {userId:msg.AKey.userId}, {projection:{_id:0}}, function (result) {
      // ログイン中のユーザにのみ回答
      if (result.length != 0 && msg.AKey.token == result[0].token ) {
        db.updateDocument('studentMemo',
                          {year    : msg.updateData.year,
                           month   : msg.updateData.month,
                           day     : msg.updateData.day,
                           gakunen : msg.updateData.gakunen,
                           cls     : msg.updateData.cls,
                           bangou  : msg.updateData.bangou},
                          {$push   : {contents : {memo   : msg.updateData.memo,
                                                  author : msg.AKey.userId}}},
                          function (res) {

          io.to(socket.id).emit('updateStudentMemoResult', res); // 送信者のみに送信
        });
      } else {
        io.to(socket.id).emit('anotherLogin', {}); // 送信者のみに送信
      }
    });
  });

  socket.on('deleteStudentMemo', function (msg) {
    db.findManyDocuments('user', {userId:msg.AKey.userId}, {projection:{_id:0}}, function (result) {
      // ログイン中のユーザにのみ回答
      if (result.length != 0 && msg.AKey.token == result[0].token ) {

        // リストで持ってるcontentsから該当のものを削除
        db.updateDocument('studentMemo',
                          {year    : msg.deleteTarget.year,
                           month   : msg.deleteTarget.month,
                           day     : msg.deleteTarget.day,
                           gakunen : msg.deleteTarget.gakunen,
                           cls     : msg.deleteTarget.cls,
                           bangou  : msg.deleteTarget.bangou,
                           'contents.memo'   : msg.deleteTarget.memo,
                           'contents.author' : msg.AKey.userId},
                          {$pull   : {contents : { memo   : msg.deleteTarget.memo,
                                                   author : msg.AKey.userId}}},
                          function (res) {

          io.to(socket.id).emit('deleteStudentMemoResult', res); // 送信者のみに送信
        });
      } else {
        io.to(socket.id).emit('anotherLogin', {}); // 送信者のみに送信
      }
    });
  });

  socket.on('getMeiboIdList', function (msg) {
//    console.log("getMeiboIdList");
    // アクセスキーの確認のために'user'にアクセスしている
    db.findManyDocuments('user', {userId:msg.AKey.userId}, {projection:{_id:0}}, function (result) {
      // ログイン中のユーザにのみ回答
      if (result.length != 0 && msg.AKey.token == result[0].token ) {
        db.findManyDocuments('goudouMeibo',{}, {projection:{_id:0,goudouMeiboId:1}}, function (res) {
          let obj = {res:res, clientState:msg.clientState};
          io.to(socket.id).emit('getMeiboIdListResult', obj); // 送信者のみに送信
        });
      } else {
        io.to(socket.id).emit('anotherLogin', {}); // 送信者のみに送信
      }
    });
  });

  socket.on('updateKyuugaku', function (msg) {
    db.findManyDocuments('user', {userId:msg.AKey.userId}, {projection:{_id:0}}, function (result) {
      // ログイン中のユーザにのみ回答
      if (result.length != 0 && msg.AKey.token == result[0].token ) {
        db.updateDocument('kyuugaku',
                          {gakunen : msg.kyuugakuData.gakunen,
                           cls     : msg.kyuugakuData.cls,
                           bangou  : msg.kyuugakuData.bangou},
                          {$set : {gakunen  : msg.kyuugakuData.gakunen,
                                   cls      : msg.kyuugakuData.cls,
                                   bangou   : msg.kyuugakuData.bangou,
                                   jiyuu    : msg.kyuugakuData.jiyuu,
                                   sYear    : msg.kyuugakuData.sYear,
                                   sMonth   : msg.kyuugakuData.sMonth,
                                   sDay     : msg.kyuugakuData.sDay,
                                   eYear    : msg.kyuugakuData.eYear,
                                   eMonth   : msg.kyuugakuData.eMonth,
                                   eDay     : msg.kyuugakuData.eDay}}, function (res) {

          io.to(socket.id).emit('updateKyuugakuResult', res); // 送信者のみに送信
        });
      } else {
        io.to(socket.id).emit('anotherLogin', {}); // 送信者のみに送信
      }
    });
  });

  // 既存のgetKekkaは（フロント側が）色々込み入ってしまってるので別にする
  // ついでに結果の項目を絞る
  socket.on('getKekkaOnePerson', function (msg) {
//    console.log("getKekkaOnePerson");
    // アクセスキーの確認のために'user'にアクセスしている
    db.findManyDocuments('user', {userId:msg.AKey.userId}, {projection:{_id:0}}, function (result) {
      // ログイン中のユーザにのみ回答
      if (result.length != 0 && msg.AKey.token == result[0].token ) {
        db.findManyDocuments('kekka', msg.SKey, {projection:{_id:0, koma:0, contents:0, memo:0}}, function (res) {
          let obj = {res:res, clientState:msg.clientState};
          io.to(socket.id).emit('getKekkaOnePersonResult', obj); // 送信者のみに送信
        });
      } else {
        io.to(socket.id).emit('anotherLogin', {}); // 送信者のみに送信
      }
    });
  });

    // 出力を絞るのでcommonDBFindとは別に
    socket.on('getUserInfo', function (msg) {
    // アクセスキーの確認のために'user'にアクセスしている
    db.findManyDocuments('user', {userId:msg.AKey.userId}, {projection:{_id:0}}, function (result) {
      // ログイン中のユーザにのみ回答
      if (result.length != 0 && msg.AKey.token == result[0].token ) {
        db.findManyDocuments('user', msg.SKey, {projection:{_id:0, userKind:0, token:0, passWord:0, jikanwari:0}}, function (res) {
          let obj = {res:res, clientState:msg.clientState};
          io.to(socket.id).emit('getUserInfoResult', obj); // 送信者のみに送信
        });
      } else {
        io.to(socket.id).emit('anotherLogin', {}); // 送信者のみに送信
      }
    });
  });

  socket.on('addGoudouMeibo', function (msg) {
    db.findManyDocuments('user', {userId:msg.AKey.userId}, {projection:{_id:0}}, function (result) {
      // ログイン中のユーザのみに追加を許可
      if (result.length != 0 && msg.AKey.token == result[0].token ) {
        db.insertManyDocuments('goudouMeibo',
                               msg.goudouMeibos,
                               function (res) {

          io.to(socket.id).emit('addGoudouMeiboResult', res); // 送信者のみに送信
        });
      } else {
        io.to(socket.id).emit('anotherLogin', {}); // 送信者のみに送信
      }
    });
  });

  // 切断
  socket.on("disconnect", () => {
    console.log("user disconnected");
    // tokenを失効させる。
    // upsert:trueとした関係で、ログインせずに切断したときにtokenだけを持つ
    // ドキュメントが生成された模様。該当のものが見つかったときのみ処理するようにする。

    // ログイン直後にログアウトしたか他の端末でログインしたというエラーメッセージが表示される
    // 端末がある模様。トークンを削除しないことにする
    // ログアウトしたかどうかの判定はできなくなる
    /*
    db.findManyDocuments('user', {token:socket.id}, function (result) {
      if ( result.length != 0 ) {
        db.updateDocument('user', {token:socket.id}, {$set:{token:""}}, function (res) {
          // do nothing
        });
      }
    });
    */
  });
});

//------ユーティリティメソッドe--------

//------サーバ構成s--------
  app.use( express.json() ); //bodyParseだったやつ
  app.use( function ( request, response, next ) {
    // js,css更新用
    if (request.url.indexOf( '/js/' ) >= 0) {
      utils.setWatch( request.url, 'script' , function ( url_path_inner ) {
        io.emit( 'script', url_path_inner ); //送信元を含む全員に送信
      });
    }
    else if (request.url.indexOf( '/css/' ) >= 0) {
      utils.setWatch( request.url, 'stylesheet' , function ( url_path_inner ) {
        io.emit( 'stylesheet', url_path_inner ); //送信元を含む全員に送信
      });
    }
    next();
  });
  app.use( express.static( __dirname + '/public' ) ); // ややはまった。これがsetwatchの設定の前にあるとだめ
  app.get('/', function ( request, response ) {
    console.log('request.url');
    console.log(request.url);

    response.sendFile( __dirname +'/public/skt.html' );
  });

//------サーバ構成e--------
//------サーバ起動s--------
  http.listen( port, function () {
    console.log(
      'express server listening on port %d in %s mode',
      port, app.settings.env)
  });

//------サーバ起動e--------
