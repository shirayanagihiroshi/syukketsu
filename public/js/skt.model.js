/*
 * skt.model.js
 * モデルモジュール
 */

skt.model = (function () {
  'use strict';

  var initModule, login, logout, islogind, getAKey,
      setTargetClass, getClassMeibo, readyAllClass, getAllClass,
      readySyukketsu, getSyukketsu, getRenraku, updateSyukketsu,
      readySkTable, getSkTableHeader, skTable2obj, rnObj2Htm,
      getUserKind,  getClsList, getMemberList, insertRenraku,
      skObj2Table, skCountPerPerson, readyTodayAll, skCountPerCls,
      initLocal, renrakuObj2Id, renrakuId2Obj, deleteRenraku,
      changePass, showGakunen, showCls, readyCalendar, getCalendar,
      updateCalendar, getJyugyou, getJikanwari, getJyugyouMeibo,
      readyKekka, getKekka, updateJikanwari, updateJyugyou, updateKekka,
      kindAndStudentSelectf, syukketsuInSyutteiSelectf,
      readySyukketsuGakunenCls, readyStudentMemo, getStudentMemo,
      updateStudentMemo, deleteStudentMemo, isMyMemo, memoDeleted,
      readyMeiboIdList, getMeiboIdList, updateKyuugaku, getKyuugaku,
      readyKekkaOnePerson, readyUserInfo, skTableCound,
      readyAllGoudouMeibo, getAllGoudouMeibo, addGoudouMeibo, //関数
      accessKey, userKind, name, targetClass, allClass,
      syukketsu, renraku, receiveAnotherLoginFlg,
      calendar, jyugyou, jikanwari, kekka, studentMemo, meiboIdList,
      kyuugaku, allGoudouMeibo;//モジュールスコープ変数

  // この配列はreason1、reason2・・・と順番にならべなきゃだめ。
  const skReasons = ['reason1', 'reason2', 'reason3', 'reason4' , 'reason5', 'reason6', 'reason7', 'reason8', 'reason9'],
      skReasonStr = ['頭痛'   , '腹痛'   , '通院'   , '体調不良', '発熱'   , '感染'   , '受験'   , '不注意' , 'その他'];

  initLocal = function () {
    accessKey   = {};
    userKind    = 0;
    name        = "";
    targetClass = {}; // こちらは1クラス分の名簿 出欠入力名簿の作成に使う
    //allClass    = {}; // こちらは全部のクラスの名簿
    syukketsu   = {}; // クラス単位の出欠情報。
    renraku     = {}; // 事務からの連絡(出欠とは別コレクション)
    // 切断や他端末でのログインにより、サーバ側のtokenが失効している状態で何かしらを
    // すると、anotherLoginを受ける。一旦ログアウトしたいが、その時にサーバのtokenを消すと
    // 他端末でログインした場合に後勝ちした方も困ってしまうので、一度ダミーログアウトする。
    receiveAnotherLoginFlg = false;
    calendar    = {};
    jyugyou     = [];
    jikanwari   = [];
    kekka       = [];
    studentMemo = [];
    meiboIdList = [];
    kyuugaku    = [];
    allGoudouMeibo = [];
  }

  initModule = function () {

    initLocal();
    allClass = {}; //これはあえて最初だけにする。

    skt.data.initModule();
    skt.appVersion.initModule();

    skt.data.registerReceive('loginResult', function (msg) {
      let eventName;
      // ログイン成功
      if ( msg.result == true ) {
        accessKey = { userId : msg.userId,
                      token  : msg.token};
        userKind  = msg.userKind;
        name      = msg.name;
        if ( msg.jyugyou != null ) {
          jyugyou   = msg.jyugyou;
        }
        if ( msg.jikanwari != null ) {
          jikanwari = msg.jikanwari;
        }

        //カレンダー情報はみんなつかうはずなので、最初に取っておくことにする。
        skt.data.sendToServer('readyCalendar', {AKey : accessKey,
                                                clientState : 'init'});
      // ログイン失敗
      } else {
        $.gevent.publish('loginFailure', [msg]);
      }
    });

    // カレンダー取得完了
    skt.data.registerReceive('readyCalendarResult', function (msg) {
      calendar = msg.calendar;
      kyuugaku = msg.kyuugaku;

      // ログイン時にみんな行うカレンダー取得
      if (msg.clientState == 'init') {
        $.gevent.publish('loginSuccess', [{ name: name }]);

      // カレンダー設定後の再取得処理
      } else if (msg.clientState == 'changed') {
        $.gevent.publish('inputNikka', [{}]);
      }
    });

    skt.data.registerReceive('logoutResult', function (msg) {
      let eventName;
      // ログアウト成功
      if ( msg.result == true ) {
        eventName = 'logoutSuccess';

        initLocal();
      // ログアウト失敗
      } else {
        // 失敗したとして、どうする？
        eventName = 'logoutFailure';
      }
      $.gevent.publish(eventName, [msg]);
    });

    skt.data.registerReceive('getClassMeiboResult', function (msg) {
      let ans;

      console.log('getClassMeiboResult');

      // 欠課時数の入力の際にも、いくつかのクラスの名簿が必要になった。
      // setTargetClass()からでなく、他のルートで処理が流れているので注意
      if ( msg.clientState == "kekka" ) {
        let i, j, targetJyugyous,
          selectf = skt.util.clsSelectf;

        if (msg.res != null) {
          // 取得した名簿はjyugyouに入れとく
          for (i = 0; i < msg.res.length; i++) {
            targetJyugyous = jyugyou.filter(selectf(msg.res[i].gakunen, msg.res[i].cls));
            // あまりないと思うが、同じ集団に対して複数の授業をするかもしれない
            for (j = 0; j < targetJyugyous.length; j++) {
              targetJyugyous[j].students = msg.res[i].students;
            }
          }
        }
        ///ここ！くらすの名簿の取得がおわった
        // 欠課入力のための処理。
        // クラスの名簿の取得が終わった(合同名簿は既にとってあるはず)
        // から、生徒の様子メモを取得
        readyStudentMemo();
        //$.gevent.publish('kekka', [{}]);

      // 担任の出欠入力等
      } else {
        if ( msg.res.length == 0 ) {
          ans = { result: false,
                  clientState:msg.clientState};
        } else {
          targetClass = msg.res[0];
          ans = { result: true,
                  clientState:msg.clientState};
        }
        $.gevent.publish('setTargetClassResult', [ans]);
      }
    });

    skt.data.registerReceive('getAllMeiboResult', function (msg) {

      console.log('getAllMeiboResult');

      allClass = msg.res;
      $.gevent.publish('readyAllClassComplete', [{ result: true,
                                                   clientState:msg.clientState}]);
    });

    skt.data.registerReceive('getSyukketsuResult', function (msg) {
      let ans = { result: true,
                  clientState:msg.clientState };

      console.log('getSyukketsuResult');

      syukketsu = msg.syukketsu;
      renraku   = msg.renraku;

      if (msg.clientState == 'input') {
        // もともとここでデータ取得処理を終えていたけど
        // さらに生徒の様子メモも取るようにした。
        skt.data.sendToServer('getStudentMemo', {AKey:{userId : accessKey.userId,
                                                       token  : accessKey.token},
                                                 SKey:{gakunen : targetClass.gakunen,
                                                       cls     : targetClass.cls},
                                                 clientState :msg.clientState});
      } else {
        $.gevent.publish('readySyukketsuResult', [ans]);
      }
    });

    skt.data.registerReceive('updateSyukketsuResult', function (msg) {

      console.log('updateSyukketsuResult');

      // もうちょい いいやり方はあるかもしれないが、とりあえず、
      // 更新したら、読み直す。
      skt.model.readySyukketsu('input');
    });

    skt.data.registerReceive('insertRenrakuResult', function (msg) {

      console.log('insertRenrakuResult');
      $.gevent.publish('insertRenrakuResult', [{ result: true }]);
    });

    // 切断または他端末でログインしたので、即ログアウトし
    // 再度のログインを促す。
    skt.data.registerReceive('anotherLogin', function (msg) {

      console.log('anotherLogin');
      receiveAnotherLoginFlg = true;
      $.gevent.publish('anotherLogin', [{ result: true }]);
    });

    // 全体集計削除ボタンでの削除完了
    skt.data.registerReceive('deleteRenrakuResult', function (msg) {

      console.log('deleteRenrakuResult');

      $.gevent.publish('deleteRenrakuComplete', [{ result: true }]);
    });

    // パスワード変更完了
    skt.data.registerReceive('changePassResult', function (msg) {
      let eventName;

      // 変更成功
      if ( msg.result == true ) {
        eventName = 'changePassSuccess';
        // 変更失敗
      } else {
        eventName = 'changePassFailure';
      }
      $.gevent.publish(eventName, [msg]);
    });

    // 日課登録完了
    skt.data.registerReceive('updateCalendarResult', function (msg) {
      // もうちょい いいやり方はあるかもしれないが、とりあえず、
      // 更新したら、読み直す。
      skt.model.readyCalendar();
    });

    // 欠課取得完了
    skt.data.registerReceive('getKekkaResult', function (msg) {
      let i, ans,
        noMeiboFlg = false,
        ikkatuJikanwariDoneFlg = false;

      console.log('getKekkaResult');

      kekka = msg.res;

      if ( msg.res.length == 0 ) {
        ans = { result: false,
                clientState:msg.clientState};
      } else {
        ans = { result: true,
                clientState:msg.clientState};
      }

      // 授業を追加したときは名簿を取得した授業と取得してない授業が混在している可能性がある。
      for (i = 0; i < jyugyou.length; i++) {
        // まだ名簿を取得していない授業がある
        if (Object.keys(jyugyou[i]).indexOf('students') == -1) {
          noMeiboFlg = true;
        }

        // これまでは授業登録時に学年組か合同名簿IDを設定していたが
        // 一括で時間割を設定した後は、学年も組も合同名簿IDも無い
        if (Object.keys(jyugyou[i]).indexOf('gakunen') == -1 &&
            Object.keys(jyugyou[i]).indexOf('cls') == -1     &&
            Object.keys(jyugyou[i]).indexOf('goudouMeiboId') == -1) {
          ikkatuJikanwariDoneFlg = true;
        }
      }

      if (ikkatuJikanwariDoneFlg) {
        //名簿を取得できないので、授業設定画面へ遷移
        $.gevent.publish('ikkatuJikanwariDone', [{}]);
        return;
      }

      // 欠課データの取得が済んだら、(そしてまだ名簿を取ってなければ)名簿を取得しておく。
      if (noMeiboFlg) {
        getJyugyouMeibo(jyugyou);

      // 名簿を取得済なら次のステップへ
      } else {
	///ここ！
        readyStudentMemo();
        //$.gevent.publish('kekka', [{}]);
      }
    });

    // 時間割登録完了
    skt.data.registerReceive('updateJikanwariResult', function (msg) {
      $.gevent.publish('kekka', [{}]);
    });

    // 授業登録完了
    skt.data.registerReceive('updateJyugyouResult', function (msg) {
      //授業が増えたら、授業に対する名簿を取得しておかなければならない。
      getJyugyouMeibo(jyugyou);
    });

    // 合同名簿取得完了
    skt.data.registerReceive('getGoudouMeiboResult', function (msg) {
      let i, j, targetJyugyous,
        gakunenClsList = [],
        selectf = function (goudouMeiboId) {
          return function ( target ) {
            if (target.goudouMeiboId == goudouMeiboId) {
              return true;
            }
          }
        };

      // 取得した名簿はjyugyouに入れとく
      for (i = 0; i < msg.res.length; i++) {
        targetJyugyous = jyugyou.filter(selectf(msg.res[i].goudouMeiboId));
        // あまりないと思うが、同じ集団に対して複数の授業をするかもしれない
        for (j = 0; j < targetJyugyous.length; j++) {
          targetJyugyous[j].students = msg.res[i].students;
        }
      }

      // 欠課の入力時のための準備の処理の続き
      // いくつかのクラスの生徒が混在している授業の名簿の名簿の取得が完了したので
      // 次にクラス単位の名簿を取得。jyugyouはログイン時に取っており、
      // jyugyouがないときは、ここまで処理がこない。
      for (i =0; i < jyugyou.length; i++) {
        if (Object.keys(jyugyou[i]).indexOf('gakunen') != -1) {
          gakunenClsList.push({ gakunen : jyugyou[i].gakunen,
                                cls     : jyugyou[i].cls });
        }
      }

      if ( gakunenClsList.length != 0 ) {
        skt.data.sendToServer('getClassMeibo', {AKey:{userId : accessKey.userId,
                                                      token  : accessKey.token},
                                                SKey:{$or    : gakunenClsList},
                                                clientState :'kekka'});

      // 取得が終わっているので、完了する。
      } else {
	///ここ！
        // 欠課入力のための処理。
        // クラスの名簿はなく、合同名簿の取得が終わった
        // から、生徒の様子メモを取得
        readyStudentMemo();
//        $.gevent.publish('kekka', [{}]);
      }
    });

    // 欠課登録完了
    skt.data.registerReceive('updateKekkaResult', function (msg) {
      // とりあえず、欠課をとりなおす。
      skt.model.readyKekka('update'); // クライアントステートを設定してるけど現状使ってない
    });

    // 生徒の様子メモ取得
    skt.data.registerReceive('getStudentMemoResult', function (msg) {
      studentMemo = msg.res;

      if (msg.clientState == 'input') {
        // あとから生徒の様子メモも取るようにした余波。
        $.gevent.publish('readySyukketsuResult', [{clientState:msg.clientState}]);
      } else {
        $.gevent.publish('kekka', [{}]);
      }
    });

    // 生徒の様子更新完了
    skt.data.registerReceive('updateStudentMemoResult', function (msg) {
      $.gevent.publish('updateStudentMemoResult', [{}]);
    });

    // 生徒の様子削除完了
    skt.data.registerReceive('deleteStudentMemoResult', function (msg) {
      $.gevent.publish('deleteStudentMemoResult', [{}]);
    });

    // 合同名簿取得完了
    skt.data.registerReceive('getMeiboIdListResult', function (msg) {
      meiboIdList = msg.res;
      $.gevent.publish('getMeiboIdListResult', [{}]);
    });

    // 休学データ登録完了
    skt.data.registerReceive('updateKyuugakuResult', function (msg) {
      // あまり良くないがモデルがもつデータを直接更新しているので
      // そのまま再描画する。
      skt.kyuugaku.redraw();
      $.gevent.publish('cancelDialog', [{}]);
    });

    // 指定の一人の欠課データ取得完了
    skt.data.registerReceive('getKekkaOnePersonResult', function (msg) {
      $.gevent.publish('getKekkaOnePersonResult', [msg]);
    });

    // ユーザ一人のデータ取得完了
    skt.data.registerReceive('getUserInfoResult', function (msg) {
      $.gevent.publish('getUserInfoResult', [msg]);
    });

    // 合同名簿IDの全部の取得完了
    skt.data.registerReceive('getAllGoudouMeiboResult', function (msg) {

      allGoudouMeibo = msg.res;
      $.gevent.publish('getAllGoudouMeiboResult', [msg]);
    });

    // 合同名簿IDの追加完了
    skt.data.registerReceive('addGoudouMeiboResult', function (msg) {
      $.gevent.publish('addGoudouMeiboFinish', [msg]);
    });

  };//initModule end



  login = function (queryObj) {
    skt.data.sendToServer('tryLogin',queryObj);
  };

  logout = function () {
    console.log(accessKey);
    // anotherLogin を受けたあとはダミーのログアウト
    if (receiveAnotherLoginFlg == true) {
      initLocal();
      $.gevent.publish('logoutSuccess', [{ result: true }]);

    // 普通はこっち
    } else {
      skt.data.sendToServer('tryLogout',{userId : accessKey.userId,
                                         token  : accessKey.token});
    }
  };

  islogind = function () {
    //accessKeyがtokenプロパティを持ち
    if ( Object.keys(accessKey).indexOf('token') !== -1 ) {
      //さらに空でない文字列が設定されていればログイン済
      if ( accessKey.token !== undefined ) {
        if (accessKey.token != "") {
          return true;
        }
      }
    }
    return false;
  };

  getAKey = function () {
    return accessKey;
  };

  // 出欠の入力の際にはまず、この関数を呼ぶ。
  // 出欠の入力/確認のためにまず、クラスの名簿を用意する。
  // 名簿情報は modelが保持する。
  // 引数なしで呼べば、担任しているクラスを取得する。
  // 担任を持っていない人が引数なしで呼ぶと
  // 結果のイベント result が false になる。
  // 学年とクラスを指定して呼べば、成功するはず。
  setTargetClass = function ( clientState, gakunen, cls ) {
    let queryObj;

    // 引数なしの時は担任しているクラスの名簿を取得
    if ( gakunen === undefined ) {
      queryObj = {AKey:{userId  : accessKey.userId,
                        token   : accessKey.token},
                  SKey:{tannin  : accessKey.userId},
                  clientState:clientState};

    // 学年とクラスが指定されているときは該当のものを指定
    } else {
      queryObj = {AKey:{userId  : accessKey.userId,
                        token   : accessKey.token},
                  SKey:{gakunen : gakunen,
                        cls     : cls},
                  clientState:clientState};
    }
    skt.data.sendToServer('getClassMeibo',queryObj);
  }

  getClassMeibo = function () {
    return targetClass;
  };

  // 全クラスの名簿を取得開始
  readyAllClass = function ( clientState ) {
    if (skt.util.isEmpty(allClass)) {
      let queryObj = {AKey:{userId  : accessKey.userId,
                            token   : accessKey.token},
                      SKey:{},
                      clientState:clientState};

      skt.data.sendToServer('getAllMeibo',queryObj);
    // 既に取得済なら、DBに問い合わせをせず完了を通知する。
    } else {
      $.gevent.publish('readyAllClassComplete', [{ result: true,
                                                   clientState:clientState }]);
    }
  }

  getAllClass = function () {
    return allClass;
  }

  // すべてのクラスの情報から、該当学年のクラスのリストを取得する
  // DBに問い合わせをせず、配列の操作だけをする
  // allClass のクラスは整数値を期待している。
  getClsList = function ( allClass, gakunen ) {
    let i, clsList = [];

    for (i = 0; i < allClass.length ; i++) {
      if (allClass[i].gakunen == gakunen) {
        clsList.push(allClass[i].cls);
      }
    }
    return clsList.sort();
  }
  getMemberList = function (allClass, gakunen, cls) {
    let selectfunc = skt.util.clsSelectf;

    return allClass.find(selectfunc(gakunen, cls));
  }

  // 出欠の入力の際には、クラス情報の取得の次に、この関数を呼ぶ。
  readySyukketsu = function (clientState) {
    let queryObj;

    queryObj = {AKey:{userId  : accessKey.userId,
                      token   : accessKey.token},
                SKey:{gakunen : targetClass.gakunen,
                      cls     : targetClass.cls},
                clientState:clientState};

    skt.data.sendToServer('getSyukketsu',queryObj);
  }

  // 上と統合できないかな
  readySyukketsuGakunenCls = function (clientState, gakunen, cls) {
    let queryObj;

    queryObj = {AKey:{userId  : accessKey.userId,
                      token   : accessKey.token},
                SKey:{gakunen : gakunen,
                      cls     : cls},
                clientState:clientState};

    skt.data.sendToServer('getSyukketsu',queryObj);
  }

  getSyukketsu = function () {
    return syukketsu;
  }

  getRenraku = function () {
    return renraku;
  }

  getUserKind = function () {
    return userKind;
  }

  getJyugyou = function () {
    return jyugyou;
  }

  getJikanwari = function () {
    return jikanwari;
  }

  getSkTableHeader = function (jimurenrakuFlg = false) {
    let str = String()
            + '<tr>'
            + '<td class="skt-talbe-header">番号</td>'
            + '<td class="skt-talbe-header">氏名</td>'
            + '<td class="skt-talbe-header">出停<div class="skt-talbe-syuttei"></span></td>'
            + '<td class="skt-talbe-header">病欠<span class="skt-talbe-byouketsu"></span></td>'
            + '<td class="skt-talbe-header">事故欠<span class="skt-talbe-jikoketsu"></span></td>'
            + '<td class="skt-talbe-header">遅刻<span class="skt-talbe-tikoku"></span></td>'
            + '<td class="skt-talbe-header">早退<span class="skt-talbe-soutai"></span></td>'
            + '<td class="skt-talbe-header">公欠<span class="skt-talbe-kouketsu"></span></td>'
            + '<td class="skt-talbe-header">頭痛<span class="skt-talbe-zutsuu"></span></td>'
            + '<td class="skt-talbe-header">腹痛<span class="skt-talbe-fukutsuu"></span></td>'
            + '<td class="skt-talbe-header">通院<span class="skt-talbe-tsuuin"></span></td>'
            + '<td class="skt-talbe-header">体調不良<span class="skt-talbe-taityou"></span></td>'
            + '<td class="skt-talbe-header">発熱<span class="skt-talbe-hatsunetsu"></span></td>'
            + '<td class="skt-talbe-header">感染<span class="skt-talbe-kansen"></span></td>'
            + '<td class="skt-talbe-header">受験<span class="skt-talbe-jyuken"></span></td>'
            + '<td class="skt-talbe-header">不注意<span class="skt-talbe-futyuui"></span></td>'
            + '<td class="skt-talbe-header">その他<span class="skt-talbe-sonota"></span></td>'
            + '<td class="skt-talbe-header">他理由</td>';
    if (jimurenrakuFlg) {
      str += '<td class="skt-talbe-header">事務からの連絡</td>'
    }
    str += '</tr>'
    return str;
  }

  // 出欠入力テーブルについて
  // 出欠入力の一行あたりのhtml（氏名の次から）を返す。
  // ここが変わるとときは、多分getSkTableHeaderも連動して変わる
  readySkTable = function (skMenbers, syussekibangou, clsSyukketsu, clsKouketsu, clsReason, clsMemo) {
    let personData,
        kind = 0,
        reason = 0,
        memo = "",
        fn = function ( bangou ) { //その出席番号のデータがあるかどうかの判定関数
          return function ( target ) {
            if (target.bangou == bangou) {
              return true;
            }
          };
        };

        if (skMenbers.length != 0) {
          personData = skMenbers.find(fn(syussekibangou)); //該当の出席番号の出欠データ

          if (personData != null) {
            // 出欠情報(kind)が既にあればそれを設定
            if ( Object.keys(personData).indexOf('kind') !== -1 ) {
              if ( personData.kind !== undefined ) {
                if (personData.kind != "") {
                  kind = personData.kind;
                }
              }
            }
            // 理由(reason)が既にあればそれを設定
            if ( Object.keys(personData).indexOf('reason') !== -1 ) {
              if ( personData.reason !== undefined ) {
                if (personData.reason != "") {
                  reason = personData.reason;
                }
              }
            }
            // メモが既にあればそれを設定
            if ( Object.keys(personData).indexOf('memo') !== -1 ) {
              if ( personData.memo !== undefined ) {
                if (personData.memo != "") {
                  memo = personData.memo;
                }
              }
            }
          }
        }

    return skObj2Table( kind, reason, memo, clsSyukketsu, clsKouketsu, clsReason, clsMemo );
  }

  // 出欠入力の一行あたりのhtmlを返す。
  skObj2Table = function (kind, reason, memo, clsSyukketsu, clsKouketsu, clsReason, clsMemo) {
    // 出欠情報 出停のみ   1
    //          病欠のみ   2
    //          事故欠のみ 4
    //          遅刻のみ   8
    //          早退のみ   16
    //          公欠のみ   32
    //          遅刻と早退 24
    // 理由は単純に表の並び順に通番
    return String()
           + clsSyukketsu + (((kind & 1) == 1) ? '1' : "") + '</td>'
           + clsSyukketsu + (((kind & 2) == 2) ? '1' : "") + '</td>'
           + clsSyukketsu + (((kind & 4) == 4) ? '1' : "") + '</td>'
           + clsSyukketsu + (((kind & 8) == 8) ? '1' : "") + '</td>'
           + clsSyukketsu + (((kind & 16) == 16) ? '1' : "") + '</td>'
           + clsKouketsu + (((kind & 32) == 32) ? '1' : "") + '</td>'
           + clsReason    + ((reason == 1) ? '1' : "")     + '</td>'
           + clsReason    + ((reason == 2) ? '1' : "")     + '</td>'
           + clsReason    + ((reason == 3) ? '1' : "")     + '</td>'
           + clsReason    + ((reason == 4) ? '1' : "")     + '</td>'
           + clsReason    + ((reason == 5) ? '1' : "")     + '</td>'
           + clsReason    + ((reason == 6) ? '1' : "")     + '</td>'
           + clsReason    + ((reason == 7) ? '1' : "")     + '</td>'
           + clsReason    + ((reason == 8) ? '1' : "")     + '</td>'
           + clsReason    + ((reason == 9) ? '1' : "")     + '</td>'
           + clsMemo      + memo                           + '</td>';
  }
  // readySkTable と対になる。
  // テーブルのチェック状況から、DBに保存するオブジェクトを生成する。
  // 戻り値ojb.result 0:チェックされていない
  //                  1:正常にチェックされた(つまり保存すべきデータがある)
  //                    この場合、戻り値ojb.updateObj が有効
  //                  2:チェック内容に異常がある
  //                     この場合、戻り値ojb.errStr が有効
  skTable2obj = function ( celldata ) {
    let retObj = {},
        updateObj = {},
        kind        = 0,
        reason      = 0,
        reasonCount = 0,
        memo        = "";

    retObj.result = 0;

    // 出席番号はsyukketsu collection において、日時やクラスを特定したあとの
    // キーになるので必須
    updateObj.bangou = Number(celldata.children[0].textContent);

    if (celldata.children[2].textContent == '1') {
      kind += 1;
    }
    if (celldata.children[3].textContent == '1') {
      kind += 2;
    }
    if (celldata.children[4].textContent == '1') {
      kind += 4;
    }
    if (celldata.children[5].textContent == '1') {
      kind += 8;
    }
    if (celldata.children[6].textContent == '1') {
      kind += 16;
    }
    if (celldata.children[7].textContent == '1') {
      kind += 32;
    }
    // 入力値がおかしい
    if (!(kind == 0 || kind == 1 || kind == 2 || kind == 4 || kind == 8 || kind == 16 || kind == 32 || kind == 24)) {
      retObj.result = 2;
      retObj.errStr = '遅刻早退以外は、種別を1つだけチェックしてください。出席番号:' + String(updateObj.bangou);
      return retObj;
    } else {
      updateObj.kind = Number(kind);
    }
    if (celldata.children[8].textContent == '1') { // 頭痛
      reason = 1;
      reasonCount++;
    }
    if (celldata.children[9].textContent == '1') { // 腹痛
      reason = 2;
      reasonCount++;
    }
    if (celldata.children[10].textContent == '1') { // 通院
      reason = 3;
      reasonCount++;
    }
    if (celldata.children[11].textContent == '1') { // 体調不良
      reason = 4;
      reasonCount++;
    }
    if (celldata.children[12].textContent == '1') { // 発熱
      reason = 5;
      reasonCount++;
    }
    if (celldata.children[13].textContent == '1') { // 感染
      reason = 6;
      reasonCount++;
    }
    if (celldata.children[14].textContent == '1') { // 受験
      reason = 7;
      reasonCount++;
    }
    if (celldata.children[15].textContent == '1') { // 不注意
      reason = 8;
      reasonCount++;
    }
    if (celldata.children[16].textContent == '1') { // その他
      reason = 9;
      reasonCount++;
    }
    // 入力値がおかしい
    if ( 2 <= reasonCount ) {
      retObj.result = 2;
      retObj.errStr = '理由は1つだけチェックしてください。出席番号:' + String(updateObj.bangou);
      return retObj;
    } else if ( reasonCount == 1 )  {
      updateObj.reason = Number(reason);
    }
    if (celldata.children[17].textContent != "") {
      memo = celldata.children[17].textContent;
      updateObj.memo = memo;
    }

    // 出欠情報と理由は必ずセットで許可
    // メモは出欠情報があるときだけ許可
    if ( ( kind != 0 && reason == 0 ) || ( kind == 0 && reason != 0 ) ||
         ( kind == 0 && reason == 0 && memo != "" ) ) {
      // 公欠は理由を求めなくてよい
      if (!(kind == 32 && reason == 0)) {
        retObj.result = 2;
        retObj.errStr = '種別と理由はいずれもチェックしてください。出席番号:' + String(updateObj.bangou);
        return retObj;
      }
    }

    // 何かしらの入力があれば
    if (kind != 0 || reason != 0 || memo != "") {
      retObj.result = 1;
      retObj.updateObj = updateObj;
    }
    return retObj;
  }

  skTableCound = function ( num, celldatas ) {
    // 出停, 病欠, ・・・, 頭痛, 腹痛, ・・・は15個ある。これらを数えて返す。
    let i,j,
      retval = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];

    for (i=1; i < (num + 1); i++) { // テーブルのヘッダがあるのでクラスの人数+1
      for (j=0; j < 15; j++) { // 番号と氏名で2ずれる
        if (celldatas[i].children[j + 2].textContent == '1') {
          retval[j] += 1;
        }
      }
    }
    return retval;
  }

  updateSyukketsu = function ( syukketsuData ) {
    console.log('updateSyukketsu');
    let queryObj = {AKey   : {userId : accessKey.userId, token : accessKey.token},
                    syukketsuData : syukketsuData};
    console.log( queryObj );
    skt.data.sendToServer('updateSyukketsu',queryObj);

  }

  insertRenraku = function ( renraku ) {
    let queryObj = {AKey   : {userId : accessKey.userId, token : accessKey.token},
                    renrakuData : renraku};
    skt.data.sendToServer('insertRenraku',queryObj);
  }

  rnObj2Htm = function ( idx, skOneDayRn, buton ) {
    let p, retStr = "",
        // 出席番号を指定して、事務からの連絡データの内該当のものを引き当てる。
        selectBangou = function ( bangou ) {
          return function ( target ) {
            if (target.bangou == bangou) {
              return true;
            }
          };
        };

    if ( skOneDayRn != null ) {
      p = skOneDayRn.find( selectBangou( idx ) );
      if ( p != null) {
        //retStr += p.name;
        if ((p.kind & 1) == 1) {
          retStr += '出停';
        }
        if ((p.kind & 2) == 2) {
          retStr += '病欠';
        }
        if ((p.kind & 4) == 4) {
          retStr += '事故欠';
        }
        if ((p.kind & 8) == 8) {
          retStr += '遅刻';
        }
        if ((p.kind & 16) == 16) {
          retStr += '早退';
        }
        if ((p.kind & 32) == 32) {
          retStr += '公欠';
        }

        if (!((p.kind & 32) == 32)) { //公欠は理由を問わない
          retStr += ':';
          retStr += skReasonStr[p.reason-1];
        }

        if ( p.memo != null ) {
          if ( p.memo != "" ) {
            retStr += '(' + p.memo + ')';
          }
        }
        retStr += buton;
      }
    }
    return retStr;
  }

  // 一人分の出欠情報を数え、計算結果を文字列で返す。
  // もし欠席してなければ、””を返す。
  // syukketsuList は syukketsu collection を学年、クラスで検索したもの
  skCountPerPerson = function (bangou, syukketsuList, startYear, startMonth, startDay, endYear, endMonth, endDay) {
    let totalPerKind, syutteiStr, byouketsuStr, jikoketsuStr, tikokuStr, soutaiStr, kouketsuStr,
        retDetail = "",
        selectBangou = function ( bangou ) {
          return function ( target ) {
            if (target.bangou == bangou) {
              return true;
            }
          };
        },
        resetCounter = function (target) {
          let i;
          for (i = 0; i < skReasons.length; i++) {
            target[skReasons[i]] = 0;
          }
        },
        countUp = function (target,reason) {
          target[skReasons[reason-1]]++; //targetのメンバであるreason1のうち、該当するものをカウントアップする。
        },
        countTotalPerKind = function (target) {
          let i, tempSum = 0;
          for (i = 0; i < skReasons.length; i++) {
            tempSum += target[skReasons[i]];
          }
          return tempSum; //targetのメンバであるreason1,reason2・・・たちの和を返す。
        },
        showReason = function (target) {
          let i, retStr = "";
          for (i = 0; i < skReasons.length; i++) {
            if (target[skReasons[i]] != 0) {
              retStr += skReasonStr[i] + String(target[skReasons[i]]) + ','
            }
          }
          if (retStr != "" ) { retStr = retStr.slice(0, -1); }//最後の ',' は邪魔なので削除
          return retStr;
        },
        daycheck = function (y, m, d, sy, sm, sd, ey, em, ed) {
          let targetDate = new Date(y, m - 1, d),
            targett   = targetDate.getTime(),
            startDate = new Date(sy, sm - 1, sd),
            endDate   = new Date(ey, em - 1, ed);

          if (startDate.getTime() <= targett && targett <= endDate.getTime()) {
            return true;
          } else {
            return false;
          }
        },
        cKind1 = {},
        cKind2 = {},
        cKind3 = {},
        cKind4 = {},
        cKind5 = {},
        cKind6 = 0; // 公欠は理由を求めないので特別扱い

    if ( syukketsuList != null && syukketsuList.length != 0 ) {

      resetCounter(cKind1);
      resetCounter(cKind2);
      resetCounter(cKind3);
      resetCounter(cKind4);
      resetCounter(cKind5);
      cKind6 = 0; // 公欠は理由を求めないので特別扱い

      // 日毎の繰り返し
      syukketsuList.forEach( function ( target ) {
        // 対象外の日時なら飛ばす
        if (daycheck(target.year, target.month, target.day, startYear, startMonth, startDay, endYear, endMonth, endDay)) {
          // 欠席者等がいて
          if ( target.member != null && target.member.length != 0 ) {
            let p = target.member.find(selectBangou(bangou));
            // それがこの人だったときは集計
            if ( p != null ) {
              if ( (p.kind & 1) == 1) {
                countUp( cKind1, p.reason );
              }
              if ( (p.kind & 2) == 2 ) {
                countUp( cKind2, p.reason );
              }
              if ( (p.kind & 4) == 4 ) {
                countUp( cKind3, p.reason );
              }
              if ( (p.kind & 8) == 8 ) {
                countUp( cKind4, p.reason );
              }
              if ( (p.kind & 16) == 16 ) {
                countUp( cKind5, p.reason );
              }
              if ( (p.kind & 32) == 32 ) {
                cKind6++;// 公欠は理由を求めないので特別扱い
              }

              // 集計ついでに詳細も追記してゆく
              retDetail += String(target.month) + '/'+ String(target.day) + rnObj2Htm(bangou, [p], "") + ' ';
            }
          }
        }
      });
      // 数え終えたので、それを表示
      totalPerKind = countTotalPerKind(cKind1);
      if ( totalPerKind != 0 ) {
        syutteiStr   = String(totalPerKind) + '(' + showReason(cKind1) + ')' ;
      }
      totalPerKind = countTotalPerKind(cKind2);
      if ( totalPerKind != 0 ) {
        byouketsuStr = String(totalPerKind) + '(' + showReason(cKind2) + ')';
      }
      totalPerKind = countTotalPerKind(cKind3);
      if ( totalPerKind != 0 ) {
        jikoketsuStr = String(totalPerKind) + '(' + showReason(cKind3) + ')';
      }
      totalPerKind = countTotalPerKind(cKind4);
      if ( totalPerKind != 0 ) {
        tikokuStr    = String(totalPerKind) + '(' + showReason(cKind4) + ')';
      }
      totalPerKind = countTotalPerKind(cKind5);
      if ( totalPerKind != 0 ) {
        soutaiStr    = String(totalPerKind) + '(' + showReason(cKind5) + ')';
      }
      if ( cKind6 != 0 ) {
        kouketsuStr  = String(cKind6);
      }
    }

    return { syuttei   : syutteiStr,
             byouketsu : byouketsuStr,
             jikoketsu : jikoketsuStr,
             tikoku    : tikokuStr,
             soutai    : soutaiStr,
             kouketsu  : kouketsuStr,
             detail    : retDetail };
  }

  readyTodayAll = function (clientState, y, m, d) {
    let queryObj, today;

    if ( y === undefined || m === undefined || d === undefined ) {
      today = new Date();
    } else{
      today = new Date(y, m, d);
    }

    queryObj = {AKey:{userId  : accessKey.userId,
                      token   : accessKey.token},
                SKey:{month : (today.getMonth() + 1),
                      day   : today.getDate()},
                clientState:clientState};

    skt.data.sendToServer('getSyukketsu',queryObj); // すでにあったイベントを利用してるから
                                                    // 返事のイベント名が微妙。注意。
  }

  // 担任の入力の方には氏名が入ってない。DB容量を気にせず持っておけばよかった。
  // type:true 担任入力 これはsyukkestu collection を見てる
  // type:false 事務連絡 これはrenraku collection を見てる
  // btncls              事務連絡を削除するためのボタンのクラス名
  skCountPerCls = function (syukketsuList,type,btncls="") {
    let i, str = "",
        ckind1 = 0, mkind1 = "",
        ckind2 = 0, mkind2 = "",
        ckind3 = 0, mkind3 = "",
        ckind4 = 0, mkind4 = "",
        ckind5 = 0, mkind5 = "",
        ckind6 = 0, mkind6 = "",
        num = syukketsuList.length,
        showReason = function (reason) {
          return skReasonStr[reason-1];
        },
        showMemo = function (memo) {
          let retStr = "";

          if (memo != null) {
            retStr = '(' + memo + ')';
          }
          return retStr;
        },
        addbutton = function (target) {
          return '<button class="' + btncls + '" '
               + 'id="' + renrakuObj2Id(target) + '">'
               + '削除'
               + '</button>';
        },
        makeJimurenrakuStr = function (titleStr, syukketsu) {
           return titleStr + '(' + String(syukketsu.bangou) + '番 ' + syukketsu.name + ':'
             + showReason(syukketsu.reason) + showMemo(syukketsu.memo) + addbutton(syukketsu) + ')';
        }

        for (i = 0; i < num ; i++) {
          if ( (syukketsuList[i].kind & 1) == 1) {
            ckind1++;
            if (type == true) {
              mkind1 += String(syukketsuList[i].bangou) + ',';
            } else {
              str += makeJimurenrakuStr(' 出停', syukketsuList[i]);
            }
          }
          if ( (syukketsuList[i].kind & 2) == 2 ) {
            ckind2++;
            if (type == true) {
              mkind2 += String(syukketsuList[i].bangou) + ',';
            } else {
              str += makeJimurenrakuStr(' 病欠', syukketsuList[i]);
            }
          }
          if ( (syukketsuList[i].kind & 4) == 4 ) {
            ckind3++;
            if (type == true) {
              mkind3 += String(syukketsuList[i].bangou) + ',';
            } else {
              str += makeJimurenrakuStr(' 事故欠', syukketsuList[i]);
            }
          }
          if ( (syukketsuList[i].kind & 8) == 8 ) {
            ckind4++;
            if (type == true) {
              mkind4 += String(syukketsuList[i].bangou) + ',';
            } else {
              str += makeJimurenrakuStr(' 遅刻', syukketsuList[i]);
            }
          }
          if ( (syukketsuList[i].kind & 16) == 16 ) {
            ckind5++;
            if (type == true) {
              mkind5 += String(syukketsuList[i].bangou) + ',';
            } else {
              str += makeJimurenrakuStr(' 早退', syukketsuList[i]);
            }
          }
          if ( (syukketsuList[i].kind & 32) == 32 ) {
            ckind6++;
            if (type == true) {
              mkind6 += String(syukketsuList[i].bangou) + ',';
            } else {
              // 公欠は理由を求めない
              str += '公欠(' + String(syukketsuList[i].bangou) + '番 ' + syukketsuList[i].name
                       + showMemo(syukketsuList[i].memo) + addbutton(syukketsuList[i]) + ')';
            }
          }
        }
        if (type == false) {
          return str;
        }
        //最後の ',' は邪魔なので削除
        if (mkind1 != "") { mkind1 = mkind1.slice(0, -1); }
        if (mkind2 != "") { mkind2 = mkind2.slice(0, -1); }
        if (mkind3 != "") { mkind3 = mkind3.slice(0, -1); }
        if (mkind4 != "") { mkind4 = mkind4.slice(0, -1); }
        if (mkind5 != "") { mkind5 = mkind5.slice(0, -1); }
        if (mkind6 != "") { mkind6 = mkind6.slice(0, -1); }
        // 数え終えたら出力
        if (ckind1 != 0) {
          str = '出停:' + String(ckind1) +'名(' + mkind1 + '),';
        }
        if (ckind2 != 0) {
          str += '病欠:' + String(ckind2) +'名(' + mkind2 + '),';
        }
        if (ckind3 != 0) {
          str += '事故欠:' + String(ckind3) +'名(' + mkind3 + '),';
        }
        if (ckind4 != 0) {
          str += '遅刻:' + String(ckind4) +'名(' + mkind4 + '),';
        }
        if (ckind5 != 0) {
          str += '早退:' + String(ckind5) +'名(' + mkind5 + '),';
        }
        if (ckind6 != 0) {
          str += '公欠:' + String(ckind6) +'名(' + mkind6 + '),';
        }
        if (ckind1 == 0 && ckind2 == 0 && ckind3 == 0 && ckind4 == 0 && ckind5 == 0 && ckind6 == 0) {
          str = '皆出席';
        } else {
          str = str.slice(0, -1); //最後の ',' は邪魔なので削除
        }
        return str;
  }

  renrakuObj2Id = function (obj) {
    return (('00' + String(obj.gakunen)).slice(-2) // 0パディング
          + ('00' + String(obj.cls)).slice(-2)
          + ('00' + String(obj.bangou)).slice(-2)
          + ('0000' + String(obj.year)).slice(-4) //どうせ西暦は4桁だからあまり意味ない
          + ('00' + String(obj.month)).slice(-2)
          + ('00' + String(obj.day)).slice(-2));
  }

  // 上記で変換しているので、学年 クラス 番号 年 月 日 がそれぞれ0パディングで2桁づつ。
  renrakuId2Obj = function (str) {
    let gakunen = Number(str.slice(0,2)),
        cls     = Number(str.slice(2,4)),
        bangou  = Number(str.slice(4,6)),
        year    = Number(str.slice(6,10)),
        month   = Number(str.slice(10,12)),
        day     = Number(str.slice(12,14));
    return ({ gakunen : gakunen,
              cls     : cls,
              bangou  : bangou,
              year    : year,
              month   : month,
              day     : day });
  }

  deleteRenraku = function(target) {
    let queryObj;

    queryObj = {AKey:{userId  : accessKey.userId,
                      token   : accessKey.token},
                SKey:{gakunen : target.gakunen,
                      cls     : target.cls,
                      year    : target.year,
                      bangou  : target.bangou,
                      month   : target.month,
                      day     : target.day}};

    skt.data.sendToServer('deleteRenraku',queryObj);
  }

  changePass = function(oldPass, newPass) {
    let queryObj;

    queryObj = {AKey:{userId  : accessKey.userId,
                      token   : accessKey.token},
                oldPass : oldPass,
                newPass : newPass};

    skt.data.sendToServer('changePass',queryObj);
  }

  showGakunen = function (gakunen) {
    let retStr,gakunenNum = Number(gakunen);

    // 1年から3年は中学校
    if (1 <= gakunenNum && gakunenNum <= 3) {
      retStr = '中学' + String(gakunenNum) + '年';

    // 4年から6年は高校
    } else {
      retStr = '高校' + String(gakunenNum - 3) + '年';
    }
    return retStr;
  }

  showCls = function (gakunen, cls) {
    let retStr,
        gakunenNum = Number(gakunen),
        clsNum     = Number(cls);

    // 1年から3年は中学校
    if (1 <= gakunenNum && gakunenNum <= 3) {
      if (clsNum == 1) {
        retStr = 'A';
      } else if (clsNum == 2) {
        retStr = 'B';
      } else if (clsNum == 3) {
        retStr = 'C';
      } else {
        retStr = 'D';
      }

    // 4年から6年は高校
    } else {
      retStr = String(clsNum);
    }
    return (retStr + '組');
  }

  readyCalendar = function () {
    let queryObj = {AKey:{userId  : accessKey.userId,
                          token   : accessKey.token},
                    clientState : 'changed'};
    skt.data.sendToServer('readyCalendar',queryObj);
  }

  getCalendar = function () {
    return calendar;
  }

  updateCalendar = function (updataArr) {
    let queryObj = {AKey:{userId  : accessKey.userId,
                          token   : accessKey.token},
                    updateData : updataArr};
    skt.data.sendToServer('updateCalendar',queryObj);
  };

  getJyugyouMeibo = function (jyugyou) {
    let i, goudouMeiboIdList = [];
    // 1クラス丸々分の名簿はclassコレクションに
    // いくつかのクラスの生徒が混在している授業の名簿はgoudouMeiboコレクションにある。
    // まず、goudouMeiboから取る
    for (i =0; i < jyugyou.length; i++) {
      if (Object.keys(jyugyou[i]).indexOf('goudouMeiboId') != -1) {
        goudouMeiboIdList.push({ goudouMeiboId : jyugyou[i].goudouMeiboId });
      }
    }

    if ( goudouMeiboIdList.length != 0 ) {
      skt.data.sendToServer('getGoudouMeibo', {AKey:{userId  : accessKey.userId,
                                                     token   : accessKey.token},
                                               SKey:{$or : goudouMeiboIdList}});
    // 合同名簿の授業がなければ(すべてクラス単位の授業なら)次のステップへ
    } else {
      let gakunenClsList = [];
      for (i =0; i < jyugyou.length; i++) {
        if (Object.keys(jyugyou[i]).indexOf('gakunen') != -1) {
          gakunenClsList.push({ gakunen : jyugyou[i].gakunen,
                                cls     : jyugyou[i].cls });
        }
      }

      skt.data.sendToServer('getClassMeibo', {AKey:{userId : accessKey.userId,
                                                    token  : accessKey.token},
                                              SKey:{$or    : gakunenClsList},
                                              clientState :'kekka'});
    }
  }

  readyKekka = function (clientState) {
    let queryObj;

    queryObj = {AKey:{userId  : accessKey.userId,
                      token   : accessKey.token},
                SKey:{userId  : accessKey.userId},
                clientState:clientState};

    skt.data.sendToServer('getKekka',queryObj);
  }

  getKekka = function () {
     return kekka;
  }

  // year, month, day, koma で指定した欠課データの
  // jyugyouId,state, contents, memoを更新する
  // state    : 'done' 入力済み
  //          : 'yet' 未入力
  //          : 'none' 削除済み
  // contents : 授業を休んだ生徒のリスト
  //          : 例：[ { "gakunen" : 4, "cls" : 8, "bangou" : 1 },
  //          :      { "gakunen" : 4, "cls" : 8, "bangou" : 2} ]
  // memo     : 授業が無くなったコマに対して授業変更の理由などをユーザが入力した値。
  //          : state が none の時はこれを表示する
  updateKekka = function (year, month, day, koma,
                          jyugyouId, state, contents, memo = "") {
    let queryObj = {AKey:{userId  : accessKey.userId,
                          token   : accessKey.token},
                    year      : year,
                    month     : month,
                    day       : day,
                    koma      : koma,
                    jyugyouId : jyugyouId,
                    state     : state,
                    contents  : contents,
                    memo      : memo};

    skt.data.sendToServer('updateKekka',queryObj);
  }

  updateJikanwari = function (jikanwariData) {
    let queryObj;

    queryObj = {AKey:{userId  : accessKey.userId,
                      token   : accessKey.token},
                jikanwariData : jikanwariData};

    // サーバに送信して取得するものだと思うが、メンドイのでそのまま保持する。
    jikanwari = jikanwariData;

    skt.data.sendToServer('updateJikanwari',queryObj);
  }

  updateJyugyou = function (jyugyouData) {
    let queryObj;

    queryObj = {AKey:{userId  : accessKey.userId,
                      token   : accessKey.token},
                jyugyouData   : jyugyouData};

    // サーバに送信して取得するものだと思うが、メンドイのでそのまま保持する。
    jyugyou = jyugyouData;

    skt.data.sendToServer('updateJyugyou',queryObj);
  }

  kindAndStudentSelectf = function (kind, bangou) {
    return function (target) {
      if ( ((target.kind & kind) == kind) && (target.bangou == bangou) ) {
        return true;
      }
    }
  }

  syukketsuInSyutteiSelectf = function (year, month, day, gakunen, cls, bangou) {
    return function (target) {
      if ( (target.year == year) && (target.month == month) && (target.day == day) &&
           (target.gakunen == gakunen) && (target.cls == cls) &&
           (target.member.length != 0) ) {
        let idx = target.member.findIndex(kindAndStudentSelectf(1, bangou)); // 1は出停
        if (idx != -1) {
          return true;
        }
      }
    }
  }

  readyStudentMemo = function () {
    let i,j,
      gakunenClsList = [],
      f = skt.util.clsSelectf;

    // メモを取得する学年クラスを設定する。
    for (i = 0; i < jyugyou.length; i++) {
      // クラス単位の授業
      if (Object.keys(jyugyou[i]).indexOf('gakunen') != -1) {
        // リストになければ追加
        if (gakunenClsList.findIndex(f(jyugyou[i].gakunen, jyugyou[i].cls)) == -1) {
          gakunenClsList.push({ gakunen : jyugyou[i].gakunen,
                                cls     : jyugyou[i].cls });
        }

      // 合同名簿IDで指定する授業(クラス混合)
      // この前の処理で名簿は取得済のはず。
      // なお、番号まで指定してもいいけど、メンドイのでクラス単位で取得（不要なデータもとれてしまう）
      } else {
        if (Object.keys(jyugyou[i]).indexOf('students') != -1) { // 名簿が無くても落ちないようにガード
          for (j = 0; j < jyugyou[i].students.length; j++) {
            // リストになければ追加
            if (gakunenClsList.findIndex(f(jyugyou[i].students[j].gakunen, jyugyou[i].students[j].cls)) == -1) {
              gakunenClsList.push({ gakunen : jyugyou[i].students[j].gakunen,
                                    cls     : jyugyou[i].students[j].cls });
            }
          }
        }
      }
    }

    // 授業が設定されていれば、生徒の様子メモを取得
    if (gakunenClsList.length != 0) {
        skt.data.sendToServer('getStudentMemo', {AKey:{userId : accessKey.userId,
                                                       token  : accessKey.token},
                                                 SKey:{$or    : gakunenClsList},
                                                 clientState :'kekka'});

    // 授業が設定されてなければ次へ進む
    } else {
      $.gevent.publish('kekka', [{}]);
    }
  }

  getStudentMemo = function () {
    return studentMemo;
  }

  updateStudentMemo = function (updateData) {
   let idx,
     f = skt.util.dayAndStudentSelectf;

    skt.data.sendToServer('updateStudentMemo', {AKey:{userId : accessKey.userId,
                                                      token  : accessKey.token},
                                                updateData   : updateData});


    // 他のデータは保存したら、非同期で取り直したり表示したりしてる
    // はずだが、これはお気楽なメモなので、そこまでしなくていいかな。
    // データは更新されたとみなして、再描画する。
    idx = studentMemo.findIndex(f(updateData.year,
                                  updateData.month,
                                  updateData.day,
                                  updateData.gakunen,
                                  updateData.cls,
                                  updateData.bangou));
    if (idx != -1) {
      studentMemo[idx].contents.push({ memo   : updateData.memo,
                                       author : accessKey.userId });
    } else {
      studentMemo.push({ year     : updateData.year,
                         month    : updateData.month,
                         day      : updateData.day,
                         gakunen  : updateData.gakunen,
                         cls      : updateData.cls,
                         bangou   : updateData.bangou,
                         contents : [{ memo   : updateData.memo,
                                      author : accessKey.userId}]});
    }
    skt.kekkaInput.redrawTable();
    skt.touroku.redrawTable()
  }

  deleteStudentMemo = function (deleteTarget) {
   let idx,
    f = skt.util.dayAndStudentSelectf,
    memofilterf = function (memo, author) {
      return function (target) {
        if ( !( (target.memo == memo) && (target.author == author) ) ) {
          return true;
        }
      }
    };

    skt.data.sendToServer('deleteStudentMemo', {AKey:{userId : accessKey.userId,
                                                      token  : accessKey.token},
                                                deleteTarget : deleteTarget});

    // データは更新されたとみなして、再描画する。
    idx = studentMemo.findIndex(f(deleteTarget.year,
                                  deleteTarget.month,
                                  deleteTarget.day,
                                  deleteTarget.gakunen,
                                  deleteTarget.cls,
                                  deleteTarget.bangou));
    if (idx != -1) {
      // 該当のものだけ削除
      studentMemo[idx].contents = studentMemo[idx].contents.filter(memofilterf(deleteTarget.memo,
                                                                               accessKey.userId));
    }
    skt.kekkaInput.redrawTable();
    skt.touroku.redrawTable()
  }

  isMyMemo = function (memoOjb) {
    let retVal = false;

    if ( (memoOjb != null) && (memoOjb.author == accessKey.userId) ) {
      retVal = true;
    }
    return retVal;
  }

  memoDeleted = function (memoOjb) {
    let retVal = false;

    if ( (memoOjb != null) && (memoOjb.delflg == 1) ) {
      retVal = true;
    }
    return retVal;
  }

  readyMeiboIdList = function () {
    skt.data.sendToServer('getMeiboIdList', {AKey : accessKey,
                                             clientState : 'jyugyouSetting'});
  }

  getMeiboIdList = function () {
    return meiboIdList;
  }

  updateKyuugaku = function ( kyuugakuData ) {
    let queryObj = {AKey   : {userId : accessKey.userId, token : accessKey.token},
                    kyuugakuData : kyuugakuData};
    let p = kyuugaku.find(skt.util.studentSelectf(kyuugakuData.gakunen,
                                                  kyuugakuData.cls,
                                                  kyuugakuData.bangou));

    // 登録したあと、サーバから取得しなおしたほうが良いが
    // 全校生徒の名簿と一緒に取ってしまっている都合上
    // 取り直すのがめんどいから
    // 直接モデルが持つデータを更新する。
    if ( p == null) {
      kyuugaku.push({gakunen  : kyuugakuData.gakunen,
                     cls      : kyuugakuData.cls,
                     bangou   : kyuugakuData.bangou,
                     jiyuu    : kyuugakuData.jiyuu,
                     sYear    : kyuugakuData.sYear,
                     sMonth   : kyuugakuData.sMonth,
                     sDay     : kyuugakuData.sDay,
                     eYear    : kyuugakuData.eYear,
                     eMonth   : kyuugakuData.eMonth,
                     eDay     : kyuugakuData.eDay});
    } else {
      p.jiyuu  = kyuugakuData.jiyuu;
      p.sYear  = kyuugakuData.sYear;
      p.sMonth = kyuugakuData.sMonth;
      p.sDay   = kyuugakuData.sDay;
      p.eYear  = kyuugakuData.eYear;
      p.eMonth = kyuugakuData.eMonth;
      p.eDay   = kyuugakuData.eDay;
    }

    skt.data.sendToServer('updateKyuugaku',queryObj);
  }

  getKyuugaku = function () {
    return kyuugaku;
  }

  readyKekkaOnePerson = function (clientState, gakunen, cls, bangou) {
    let queryObj;

    queryObj = {AKey:{userId  : accessKey.userId,
                      token   : accessKey.token},
                SKey:{contents:{$elemMatch:{gakunen : gakunen,
                                            cls     : cls,
                                            bangou  : bangou}}},
                clientState:clientState};

    skt.data.sendToServer('getKekkaOnePerson',queryObj);
  }

  readyUserInfo = function (clientState) {
    let queryObj;

    queryObj = {AKey : {userId : accessKey.userId,
                        token  : accessKey.token},
                SKey : {},
                clientState : clientState};

    skt.data.sendToServer('getUserInfo',queryObj);
  }

  readyAllGoudouMeibo = function (clientState) {
    let queryObj;

    queryObj = {AKey : {userId : accessKey.userId,
                        token  : accessKey.token},
                SKey : {},
                clientState : clientState};

    skt.data.sendToServer('getAllGoudouMeibo',queryObj);
  }

  getAllGoudouMeibo = function () {

    return allGoudouMeibo;
  }

  addGoudouMeibo = function (addData) {
    let queryObj = {AKey : {userId : accessKey.userId,
                            token  : accessKey.token},
                    goudouMeibos : addData};
    skt.data.sendToServer('addGoudouMeibo',queryObj);
  }

  return { initModule      : initModule,
          login            : login,
          logout           : logout,
          islogind         : islogind,
          getAKey          : getAKey,
          setTargetClass   : setTargetClass,
          getClassMeibo    : getClassMeibo,
          readyAllClass    : readyAllClass,
          getAllClass      : getAllClass,
          getClsList       : getClsList,
          getMemberList    : getMemberList,
          readySyukketsu   : readySyukketsu,
          getSyukketsu     : getSyukketsu,
          getRenraku       : getRenraku,
          getUserKind      : getUserKind,
          getJyugyou       : getJyugyou,
          getJikanwari     : getJikanwari,
          readySkTable     : readySkTable,
          getSkTableHeader : getSkTableHeader,
          skTable2obj      : skTable2obj,
          updateSyukketsu  : updateSyukketsu,
          insertRenraku    : insertRenraku,
          rnObj2Htm        : rnObj2Htm,
          skObj2Table      : skObj2Table,
          skCountPerPerson : skCountPerPerson,
          readyTodayAll    : readyTodayAll,
          skCountPerCls    : skCountPerCls,
          renrakuId2Obj    : renrakuId2Obj,
          deleteRenraku    : deleteRenraku,
          changePass       : changePass,
          showGakunen      : showGakunen,
          showCls          : showCls,
          readyCalendar    : readyCalendar,
          getCalendar      : getCalendar,
          updateCalendar   : updateCalendar,
          getJyugyouMeibo  : getJyugyouMeibo,
          readyKekka       : readyKekka,
          getKekka         : getKekka,
          updateKekka      : updateKekka,
          updateJikanwari  : updateJikanwari,
          updateJyugyou    : updateJyugyou,
          syukketsuInSyutteiSelectf : syukketsuInSyutteiSelectf,
          readySyukketsuGakunenCls  : readySyukketsuGakunenCls,
          getStudentMemo   : getStudentMemo,
          updateStudentMemo: updateStudentMemo,
          deleteStudentMemo: deleteStudentMemo,
          isMyMemo         : isMyMemo,
          memoDeleted      : memoDeleted,
          readyMeiboIdList : readyMeiboIdList,
          getMeiboIdList   : getMeiboIdList,
          updateKyuugaku   : updateKyuugaku,
          getKyuugaku      : getKyuugaku,
          readyKekkaOnePerson : readyKekkaOnePerson,
          readyUserInfo    : readyUserInfo,
          skTableCound     : skTableCound,
          readyAllGoudouMeibo : readyAllGoudouMeibo,
          getAllGoudouMeibo   : getAllGoudouMeibo,
          addGoudouMeibo      : addGoudouMeibo
        };
}());
