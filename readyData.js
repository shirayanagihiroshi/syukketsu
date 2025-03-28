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
    addGoudouMeibo,
    addGoudouMeiboList,// = JSON.parse(fs.readFileSync('./data2DB/goudouMeibo.json', 'utf8')),
    addGoudouMeiboListTemp,
    addAllJikanwari,
    allJikanwariList = JSON.parse(fs.readFileSync('./data2DB/jikanwariPerTeacher.json', 'utf8'));

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
      if (false) {
        db.deleteManyDocuments('user', {}, function (res) { nextstep();} );
      } else { nextstep(); }
      break;
    case 2:
      if (false) {
        addUser(addUserList);
      } else { nextstep(); }
      break;
    case 3:
      if (false) {
        db.deleteManyDocuments('class', {}, function (res) { nextstep();} );
      } else { nextstep(); }
      break;
    case 4:
      if (false) {
        addClass(addClassList);
      } else { nextstep(); }
      break;
    case 5:
      if (false) {
        db.deleteManyDocuments('goudouMeibo', {}, function (res) { nextstep();} );
      } else { nextstep(); }
      break;
    case 6:
      if (false) {
        addGoudouMeibo(addGoudouMeiboList);
      } else { nextstep(); }
      break;
    case 7:
      if (false) {
        db.deleteManyDocuments('syukketsu', {}, function (res) { nextstep();} );
      } else { nextstep(); }
      break;
    case 8:
      if (false) {
          db.deleteManyDocuments('renraku', {}, function (res) { nextstep();} );
      } else { nextstep(); }
        break;
    case 9:
      if (false) {
        db.deleteManyDocuments('calendar', {}, function (res) { nextstep();} );
      } else { nextstep(); }
      break;
    case 10:
      if (false) {
        db.deleteManyDocuments('kekka', {}, function (res) { nextstep();} );
      } else { nextstep(); }
      break;
    case 11:
      if (false) {
        db.deleteManyDocuments('kyuugaku', {}, function (res) { nextstep();} );
      } else { nextstep(); }
      break;
    case 12:
      if (false) {
        db.deleteManyDocuments('studentMemo', {}, function (res) { nextstep();} );
      } else { nextstep(); }
      break;
    case 13:
      if (false) {
        addAllJikanwari(allJikanwariList);
      } else { nextstep(); }
      break;
    case 14:
      console.log('readyData finish');
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

addGoudouMeibo = function (addGoudouMeiboList) {
  db.insertManyDocuments('goudouMeibo', addGoudouMeiboList, function ( result ) {
    console.log("addGoudouMeiboList done");
    nextstep();
  });
}

addAllJikanwari = function (allJikanwariList) {
  let i, complete_num, lst,
    f = function (target) {
      if ( Object.keys(target).indexOf('userId') != -1 ) {
        return true;
      } else {
        return false;
      }
    };

  // userIdが無いと登録できない。例えばALT分は登録しない
  lst = allJikanwariList.filter(f);

  // 登録完了数を設定
  complete_num = 0;

  for (i = 0; i < lst.length; i++) {
    db.updateDocument('user',
                      {userId : lst[i].userId},
                      {$set   : {jyugyou   : lst[i].jyugyou,
                                 jikanwari : lst[i].jikanwari}},
                      function (result) {
                        complete_num++;
                        if (complete_num == lst.length) {
                          console.log('addAllJikanwari done');
                          nextstep();
                        }
                      });
  }
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
