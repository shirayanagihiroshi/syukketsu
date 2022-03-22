'use strict';
// サーバで直接ユーザ登録、削除などをする用
// 本番環境でうっかり使うと大惨事が起きるので注意

// 使い方
// readyData　の中の必要な部分のコメントアウトを外しnodeで実行する。
//
// 注意
// JSON.parse は単一引用符を許容しない
// JSON.parse 中ではコメントが許されないっぽい
//
//------モジュールスコープ変数s--------
  var
    readyData, emitter, nextstep,
    fs        = require('fs'),
    crypt     = require('./lib/crypt'),
    db        = require('./lib/database'),
    events    = require('events'),
    stage     = 0,

    addUser,
    addUserList,// = JSON.parse(fs.readFileSync('./data2DB/user.json', 'utf8')),
    addUserListTemp,
    addClass,
    addClassList,// = JSON.parse(fs.readFileSync('./data2DB/class.json', 'utf8')),
    addClassListTemp,
    addSyukketsu,
    addSyukketsuList = JSON.parse(fs.readFileSync('./data2DB/syukketsu.json', 'utf8')),
    addRenraku,
    addRenrakuList = JSON.parse(fs.readFileSync('./data2DB/renraku.json', 'utf8')),
    addCalendar,
    addCalendarList = JSON.parse(fs.readFileSync('./data2DB/calendar.json', 'utf8')),
    addKekka,
    addKekkaList = JSON.parse(fs.readFileSync('./data2DB/kekka.json', 'utf8')),
    addGoudouMeibo,
    addGoudouMeiboList,// = JSON.parse(fs.readFileSync('./data2DB/goudouMeibo.json', 'utf8')),
    addGoudouMeiboListTemp;

// excelでutf-8のjsonを出力して、読み込もうとしたが、
// excelはBOM付きの UTF8を出力するらしいので、JSON.parseに
// Unexpected token ﻿ in JSON at position 0
// と怒られる。
// 先頭を無視するとうまく動く様子
addUserListTemp = fs.readFileSync('./data2DB/user.json',  'utf8');
if (addUserListTemp.charCodeAt(0) === 0xFEFF) {
  addUserListTemp = addUserListTemp.substr(1);
}
addUserList = JSON.parse(addUserListTemp);

addClassListTemp = fs.readFileSync('./data2DB/class.json', 'utf8');
if (addClassListTemp.charCodeAt(0) === 0xFEFF) {
  addClassListTemp = addClassListTemp.substr(1);
}
addClassList = JSON.parse(addClassListTemp);

addGoudouMeiboListTemp = fs.readFileSync('./data2DB/goudouMeibo.json', 'utf8');
if (addGoudouMeiboListTemp.charCodeAt(0) === 0xFEFF) {
  addGoudouMeiboListTemp = addGoudouMeiboListTemp.substr(1);
}
addGoudouMeiboList = JSON.parse(addGoudouMeiboListTemp);

//------モジュールスコープ変数e--------

//------ユーティリティメソッドs--------
readyData = function () {
  stage++;

  // 前の処理が終えたら次をやっていく
  // 処理したくないところはtrueをfalseにして飛ばす
  switch (stage) {
    case 1:
      if (true) {
        db.deleteManyDocuments('user', {}, function (res) { nextstep();} );
      } else { nextstep(); }
      break;
    case 2:
      if (true) {
        addUser(addUserList);
      } else { nextstep(); }
      break;
    case 3:
      if (true) {
        db.deleteManyDocuments('class', {}, function (res) { nextstep();} );
      } else { nextstep(); }
      break;
    case 4:
      if (true) {
        addClass(addClassList);
      } else { nextstep(); }
      break;
    case 5:
      if (true) {
        db.deleteManyDocuments('syukketsu', {}, function (res) { nextstep();} );
      } else { nextstep(); }
      break;
    case 6:
      if (true) {
        addSyukketsu(addSyukketsuList);
      } else { nextstep(); }
      break;
    case 7:
      if (true) {
          db.deleteManyDocuments('renraku', {}, function (res) { nextstep();} );
        } else { nextstep(); }
        break;
    case 8:
      if (true) {
          addRenraku(addRenrakuList);
        } else { nextstep(); }
        break;
    case 9:
      if (true) {
        db.deleteManyDocuments('calendar', {}, function (res) { nextstep();} );
      } else { nextstep(); }
      break;
    case 10:
      if (true) {
        addCalendar(addCalendarList);
      } else { nextstep(); }
      break;
    case 11:
      if (true) {
        db.deleteManyDocuments('kekka', {}, function (res) { nextstep();} );
      } else { nextstep(); }
      break;
    case 12:
      if (true) {
        addKekka(addKekkaList);
      } else { nextstep(); }
      break;
    case 13:
      if (true) {
        db.deleteManyDocuments('goudouMeibo', {}, function (res) { nextstep();} );
      } else { nextstep(); }
      break;
    case 14:
      if (true) {
        addGoudouMeibo(addGoudouMeiboList);
      } else { nextstep(); }
      break;
    case 15:
      process.exit(0);
      break;
  }
  //console.log('readyData called stage ' + stage);
}

nextstep = function () {
  emitter.emit('nextstep');
};

addUser = function (userList) {
  const listnum = userList.length;
  let i, complete_num, addUserInner;

  //登録完了数を設定
  complete_num = 0;

  //このように一件つづ登録するなら、ハッシュのコールバックの中でユーザIDを使う関係で
  //ユーザIDが関数の引数として存在しなければならない。
  //そのためのaddUserInner
  addUserInner = function (userIdStr, userKindStr, nameStr, passWordStr) {
    crypt.hash(passWordStr,function (hashstr) {
      let insertObj = {userId   : userIdStr,
                       userKind : userKindStr,
                       name     : nameStr,
                       token    : "",
                       passWord : hashstr};
      db.insertDocument('user', insertObj, function (result) {
        complete_num++;
        if (complete_num == listnum) {
            console.log('addUser done');
            nextstep();
        }
      });
    });
  };

  for ( i = 0; i < listnum; i++) {
    addUserInner(userList[i].userId,
                 userList[i].userKind,
                 userList[i].name,
                 userList[i].passWord);
  }
}

addClass = function (addClassList) {
  db.insertManyDocuments('class', addClassList, function ( result ) {
    console.log("addClass done");
    nextstep();
  });
}

addSyukketsu = function (addSyukketsuList) {
  db.insertManyDocuments('syukketsu', addSyukketsuList, function ( result ) {
    console.log("addSyukketsu done");
    nextstep();
  });
}

addRenraku = function (addRenrakuList) {
  db.insertManyDocuments('renraku', addRenrakuList, function ( result ) {
    console.log("addRenraku done");
    nextstep();
  });
}

addCalendar = function (addCalendarList) {
  db.insertManyDocuments('calendar', addCalendarList, function ( result ) {
    console.log("addCalendar done");
    nextstep();
  });
}

addKekka = function (addKekkaList) {
  db.insertManyDocuments('kekka', addKekkaList, function ( result ) {
    console.log("addKekkaList done");
    nextstep();
  });
}

addGoudouMeibo = function (addGoudouMeiboList) {
  db.insertManyDocuments('goudouMeibo', addGoudouMeiboList, function ( result ) {
    console.log("addGoudouMeiboList done");
    nextstep();
  });
}

//------ユーティリティメソッドe--------

//------設定s--------
emitter = new events.EventEmitter();
emitter.on('nextstep', readyData);

// mongoDBの接続完了を待つため、適当に待ってから開始
// うっかり実行してしまうのを防ぐため、引数に true が指定されたときのみ開始
if (process.argv[2] == 'true') {
  setTimeout(function () {nextstep();}, 200);
} else {
  console.log('do nothing');
  console.log('実行したければ、「node readyData.js true」として実行してください');
  process.exit(0);
}
//------設定e--------
