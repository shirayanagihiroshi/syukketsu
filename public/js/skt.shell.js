/*
 * skt.shell.js
 * シェルモジュール
 */
skt.shell = (function () {
  'use strict';

  //---モジュールスコープ変数---
  var configMap = {
    anchor_schema_map : {
      status : {dialog          : true,
                matiuke         : true, //従属変数なし
                inputSyukketsu  : true,
                jimurenraku     : true, //従属変数なし
                clsTotal        : true,
                schoolTotal     : true,
                changePass      : true, //従属変数なし
                proxy           : true, //従属変数なし
                calendar        : true,
                kekka           : true,
                setJikanwari    : true, //従属変数なし
                setJyugyou      : true, //従属変数なし
                kekkaInput      : true,
              },
      _status : {
        dialogKind : { login          : true,  // status : dialog のとき使用
                       logout         : true,  // status : dialog のとき使用
                       invalid        : true,  // status : dialog のとき使用
                       noInvalid      : true,  // status : dialog のとき使用
                       verifySkUpdate : true,  // status : dialog のとき使用
                       verifyRkInsert : true,  // status : dialog のとき使用
                       delRenraku     : true,  // status : dialog のとき使用
                       anotherLogin   : true,  // status : dialog のとき使用
                       verifyChgPass  : true,  // status : dialog のとき使用
                       verifyClUpdate : true,  // status : dialog のとき使用
                       verifyJKWUpdate: true,  // status : dialog のとき使用
                       verifyJGYUpdate: true,  // status : dialog のとき使用
                       verifyKKUpdate : true,  // status : dialog のとき使用
                       verifyJGYDelete: true,  // status : dialog のとき使用
                       kekkaReason    : true,  // status : dialog のとき使用
                       studentMemo    : true,  // status : dialog のとき使用
                       delStudentMemo : true}, // status : dialog のとき使用
        year  : true,                  // status : inputSyukketsu,schoolTotal,calendar,kekka,kekkaInputのとき使用
        month : true,                  // status : inputSyukketsu,schoolTotal,calendar,kekka,kekkaInputのとき使用
        day   : true,                  // status : inputSyukketsu,schoolTotal,calendar,kekka,kekkaInputのとき使用
        sYear  : true,                 // status : clsTotal の時使用
        sMonth : true,                 // status : clsTotal の時使用
        sDay   : true,                 // status : clsTotal の時使用
        eYear  : true,                 // status : clsTotal の時使用
        eMonth : true,                 // status : clsTotal の時使用
        eDay   : true,                 // status : clsTotal の時使用
        koma  : true,                  // status : kekkaInputのとき使用
        jyugyouId : true,              // status : kekkaInputのとき使用
        mode      : true               // status : kekkaのとき使用(edit or normal), kekkaInputのとき使用(numOnly or normal)
      }
      // アンカーマップとして許容される型を事前に指定するためのもの。
      // 例えば、color : {red : true, blue : true}
      // とすれば、キーcolorの値は'red'か'blue'のみ許容される。
      // 単にtrueとすれば、どんな値も許容される。従属キーに対しても同じ。
      // ここでキーとして挙げていないものをキーとして使用するのは許容されない。
    },
    main_html : String()
      + '<div class="skt-shell-head">'
        + '<div class="skt-shell-head-title"></div>'
        + '<button class="skt-shell-head-acct"></button>'
      + '</div>'
      + '<div class="skt-shell-main">'
        + '<div class="skt-shell-main-menu"></div>'
        + '<div class="skt-shell-main-content">'
          + '<a href="https://shirayanagihiroshi.github.io/syukketsu/">sktの使い方を見る</a>'
        + '</div>'
      + '</div>',
    titleStr : String()
      + 'hamamatsu nittai skt'
    },
    stateMap = {
      $container : null,
      anchor_map : {},
      skYear     : 0,
      skMonth    : 0,
      skDay      : 0,
      koma       : 0,
      jyugyouId  : 0,
      errStr     : "",   // エラーダイアログで表示する文言を一時的に保持。
                         // ここになきゃいけない情報でないので良い場所を見つけたら移す
      studentMemo : null,// 登録対象の生徒の様子メモ
                         // 出欠入力画面からも欠課入力画面からも遷移して
                         // 入力するので、代表して一時的にここで保持
      delMemo    : null  // 削除対象の生徒の様子メモ
                         // 削除も複数画面から行うから、代表して一時的にここで保持
    },
    jqueryMap = {},
    copyAnchorMap, changeAnchorPart, onHashchange, setModal,
    setJqueryMap, initModule, stateCtl, resetDate, inputStudentMemo,
    deleteStudentMemo;

  //---DOMメソッド---
  setJqueryMap = function () {
    var $container = stateMap.$container;
    jqueryMap = {
      $container : $container,
      $title     : $container.find( '.skt-shell-head-title' ),
      $acct      : $container.find( '.skt-shell-head-acct' ),
      $menu      : $container.find( '.skt-shell-main-menu' ),
      $content   : $container.find( '.skt-shell-main-content' )
    };
  }

  //---イベントハンドラ---
  onHashchange = function ( event ) {
    var anchor_map_previous = copyAnchorMap(),
        anchor_map_proposed,
        _s_status_previous, _s_status_proposed;

    // アンカーの解析を試みる
    try {
      anchor_map_proposed = $.uriAnchor.makeAnchorMap();
    } catch ( error ) {
      $.uriAnchor.setAnchor( anchor_map_previous, null, true );
      return false;
    }
    stateMap.anchor_map = anchor_map_proposed;

    // makeAnchorMapは独立したキー毎に、'_s_キー'というのを作る。
    // 該当するキー値と、そのキーに従属したキー値が含まれる。
    // おそらくここの処理のように、変更の有無を調べやすくするためのもの。
    // spaの本には単に便利な変数と書いてあった。
    _s_status_previous = anchor_map_previous._s_status;
    _s_status_proposed = anchor_map_proposed._s_status;

    // 変更されている場合の処理
    if ( !anchor_map_previous || _s_status_previous !== _s_status_proposed ) {

      stateCtl(anchor_map_proposed);
    }

    return false;
  }

  // 真のイベントハンドラ
  // 状態管理 URLの変更を感知して各種処理を行う。
  // 履歴に残る操作は必ずここを通る。
  // なお、従属変数は'_s_キー'に入っている。
  stateCtl = function ( anchor_map ) {
    let clearMainContent = function () {
      skt.dialog.removeDialog();
      skt.dialogOkCancel.removeDialog();
      skt.dialogInput.removeDialog();
      skt.touroku.removeTouroku();
      skt.renraku.removeRenraku();
      skt.clsTotal.removeClsTotal();
      skt.schoolTotal.removeSchoolTotal();
      skt.changePass.removeChangePass();
      skt.proxy.removeProxy();
      skt.kekka.removeKekka();
      skt.kekkaJikanwari.removeKekkaJikanwari();
      skt.kekkaJyugyou.removeKekkaJyugyou();
      skt.kekkaInput.removeKekkaInput();
    };

    // ダイアログの場合
    if ( anchor_map.status == 'dialog' ) {
      if ( anchor_map._status.dialogKind == 'login' ) {
        setModal(true);
        skt.dialog.configModule({});
        skt.dialog.initModule( jqueryMap.$container );
      } else if ( anchor_map._status.dialogKind == 'logout' ) {
        setModal(true);
        skt.dialogOkCancel.configModule({showStr : 'ログアウトしますか？',
                                         okFunc  : skt.model.logout,
                                         okStr   : 'ok'});
        skt.dialogOkCancel.initModule( jqueryMap.$container );
      } else if ( anchor_map._status.dialogKind == 'invalid' ) {
        setModal(true);
        skt.dialogOkCancel.configModule({showStr : stateMap.errStr,
                                         // OKでもキャンセルと同じ動きをさせる
                                         okFunc  : skt.dialogOkCancel.onClose,
                                         okStr   : 'cancel'});
        skt.dialogOkCancel.initModule( jqueryMap.$container );
      } else if ( anchor_map._status.dialogKind == 'noInvalid' ) {
        setModal(true);
        skt.dialogOkCancel.configModule({showStr : stateMap.errStr,
                                         // OKでもキャンセルと同じ動きをさせる
                                         // はいはいわかりましたくらいのシーンである
                                         // dialogKind が invalid の時の処理と
                                         // 本質的には違わない。
                                         // ボタンにcancelって書いてあると
                                         // 違和感があるからOKにしとく
                                         okFunc  : skt.dialogOkCancel.onClose,
                                         okStr   : 'ok'});
        skt.dialogOkCancel.initModule( jqueryMap.$container );
      } else if ( anchor_map._status.dialogKind == 'verifySkUpdate' ) {
        setModal(true);
        skt.dialogOkCancel.configModule({showStr : '出欠情報を登録して良いですか？',
                                         okFunc  : skt.touroku.Update,
                                         okStr   : 'ok'});
        skt.dialogOkCancel.initModule( jqueryMap.$container );
      } else if ( anchor_map._status.dialogKind == 'verifyRkInsert' ) {
        setModal(true);
        skt.dialogOkCancel.configModule({showStr : '出欠連絡を登録して良いですか？',
                                         okFunc  : skt.renraku.Update,
                                         okStr   : 'ok'});
        skt.dialogOkCancel.initModule( jqueryMap.$container );
      } else if (anchor_map._status.dialogKind == 'delRenraku') {
        setModal(true);
        skt.dialogOkCancel.configModule({showStr : stateMap.errStr + 'の連絡を削除して良いですか？',
                                         okFunc  : skt.schoolTotal.deleleRenraku,
                                         okStr   : 'ok'});
        skt.dialogOkCancel.initModule( jqueryMap.$container );
      } else if (anchor_map._status.dialogKind == 'anotherLogin') {
        // ここではあえてsetModalしない
        skt.dialogOkCancel.configModule({showStr : '接続が切れたか、他の端末でログインしました。再度ログインしてください',
                                         okFunc  : skt.model.logout,
                                         okStr   : 'ok'});
        skt.dialogOkCancel.initModule( jqueryMap.$container );
      } else if (anchor_map._status.dialogKind == 'verifyChgPass') {
        setModal(true);
        skt.dialogOkCancel.configModule({showStr : 'パスワードを変更してよろしいですか？',
                                         okFunc  : skt.changePass.changeExe,
                                         okStr   : 'ok'});
        skt.dialogOkCancel.initModule( jqueryMap.$container );
      } else if (anchor_map._status.dialogKind == 'verifyClUpdate') {
        setModal(true);
        skt.dialogOkCancel.configModule({showStr : stateMap.errStr,
                                         okFunc  : skt.calendar.Update,
                                         okStr   : 'ok'});
        skt.dialogOkCancel.initModule( jqueryMap.$container );
      } else if (anchor_map._status.dialogKind == 'verifyJKWUpdate') {
        setModal(true);
        skt.dialogOkCancel.configModule({showStr : stateMap.errStr,
                                         okFunc  : skt.kekkaJikanwari.update,
                                         okStr   : 'ok'});
        skt.dialogOkCancel.initModule( jqueryMap.$container );
      } else if (anchor_map._status.dialogKind == 'verifyJGYUpdate') {
        setModal(true);
        skt.dialogOkCancel.configModule({showStr : stateMap.errStr,
                                         okFunc  : skt.kekkaJyugyou.update,
                                         okStr   : 'ok'});
        skt.dialogOkCancel.initModule( jqueryMap.$container );
      } else if (anchor_map._status.dialogKind == 'verifyKKUpdate') {
        setModal(true);
        skt.dialogOkCancel.configModule({showStr : '欠課を登録して良いですか？',
                                         okFunc  : skt.kekkaInput.update,
                                         okStr   : 'ok'});
        skt.dialogOkCancel.initModule( jqueryMap.$container );
      } else if (anchor_map._status.dialogKind == 'verifyJGYDelete') {
        setModal(true);
        skt.dialogOkCancel.configModule({showStr : 'メモを削除して良いですか？',
                                         okFunc  : skt.kekka.onDeleteReal,
                                         okStr   : 'ok'});
        skt.dialogOkCancel.initModule( jqueryMap.$container );
      } else if (anchor_map._status.dialogKind == 'kekkaReason') {
        setModal(true);
        skt.dialogInput.configModule({detailStr : stateMap.errStr + 'の授業を削除して良いですか？(入力データは破棄されます)。',
                                      textboxTitle : '理由をメモ(省略可)',
                                      okFunc  : skt.kekka.onDelete });
        skt.dialogInput.initModule( jqueryMap.$container );
      } else if (anchor_map._status.dialogKind == 'studentMemo') {
        setModal(true);
        skt.dialogInput.configModule({detailStr : stateMap.errStr + '　の様子を入力しますか？',
                                      textboxTitle : 'これは他の先生と共有されます',
                                      okFunc  : inputStudentMemo });
        skt.dialogInput.initModule( jqueryMap.$container );
      } else if (anchor_map._status.dialogKind == 'delStudentMemo') {
        setModal(true);
        skt.dialogOkCancel.configModule({showStr : stateMap.errStr + '　を削除しますか？',
                                         okFunc  : deleteStudentMemo,
                                         okStr   : 'ok' });
        skt.dialogOkCancel.initModule( jqueryMap.$container );
      }



    // 待ち受け画面の場合
    } else if ( anchor_map.status == 'matiuke' ) {
      setModal(false);
      skt.dialog.removeDialog();
      skt.dialogOkCancel.removeDialog();
      skt.dialogInput.removeDialog();

    // 出欠入力(担任)画面の場合
    } else if ( anchor_map.status == 'inputSyukketsu' ) {
      let obj = { targetYear  : anchor_map._status.year,
                  targetMonth : anchor_map._status.month,
                  targetDay   : anchor_map._status.day,
                  mode        : anchor_map._status.mode}

      setModal(false);
      clearMainContent();

      skt.touroku.configModule(obj);
      skt.touroku.initModule( jqueryMap.$content );

    // 出欠連絡(事務)画面の場合
    } else if (anchor_map.status == 'jimurenraku') {

      setModal(false);
      clearMainContent();

      skt.renraku.configModule({});
      skt.renraku.initModule( jqueryMap.$content );

    // 出欠確認(担任)画面の場合
    } else if ( anchor_map.status == 'clsTotal' ) {
      let obj = { startYear  : anchor_map._status.sYear,
                  startMonth : anchor_map._status.sMonth,
                  startDay   : anchor_map._status.sDay,
                  endYear    : anchor_map._status.eYear,
                  endMonth   : anchor_map._status.eMonth,
                  endDay     : anchor_map._status.eDay};

      setModal(false);
      clearMainContent();

      skt.clsTotal.configModule(obj);
      skt.clsTotal.initModule( jqueryMap.$content );

    // 出欠確認(全体)画面の場合
    } else if (anchor_map.status == 'schoolTotal') {
      let obj = { year  : anchor_map._status.year,
                  month : anchor_map._status.month,
                  day   : anchor_map._status.day}

      setModal(false);
      clearMainContent();

      skt.schoolTotal.configModule(obj);
      skt.schoolTotal.initModule( jqueryMap.$content );

    // パスワード変更の場合
    } else if (anchor_map.status == 'changePass') {
      setModal(false);
      clearMainContent();

      skt.changePass.configModule({});
      skt.changePass.initModule( jqueryMap.$content );

    // 代理で入力の場合
    } else if (anchor_map.status == 'proxy') {
      setModal(false);
      clearMainContent();

      skt.proxy.configModule({});
      skt.proxy.initModule( jqueryMap.$content );

    // 日課を設定の場合
    } else if (anchor_map.status == 'calendar') {
      let obj = { targetYear  : anchor_map._status.year,
                  targetMonth : anchor_map._status.month,
                  targetDay   : anchor_map._status.day}

      setModal(false);
      clearMainContent();

      skt.calendar.configModule(obj);
      skt.calendar.initModule( jqueryMap.$content );

    // 欠課入力(管理)画面の場合
    } else if ( anchor_map.status == 'kekka' ) {
      let obj = { targetYear  : anchor_map._status.year,
                  targetMonth : anchor_map._status.month,
                  targetDay   : anchor_map._status.day,
                  mode        : anchor_map._status.mode };

      setModal(false);
      clearMainContent();

      skt.kekka.configModule(obj);
      skt.kekka.initModule( jqueryMap.$content );

    // 時間割設定の場合
    } else if (anchor_map.status == 'setJikanwari') {
      setModal(false);
      clearMainContent();
      skt.kekkaJikanwari.configModule({});
      skt.kekkaJikanwari.initModule( jqueryMap.$content );

    // 授業設定の場合
    } else if (anchor_map.status == 'setJyugyou') {
      setModal(false);
      clearMainContent();
      skt.kekkaJyugyou.configModule({});
      skt.kekkaJyugyou.initModule( jqueryMap.$content );

    // 欠課入力(入力)画面の場合
    } else if ( anchor_map.status == 'kekkaInput' ) {
      let obj = { targetYear  : anchor_map._status.year,
                  targetMonth : anchor_map._status.month,
                  targetDay   : anchor_map._status.day,
                  koma        : anchor_map._status.koma,
                  jyugyouId   : anchor_map._status.jyugyouId,
                  mode        : anchor_map._status.mode }

      setModal(false);
      clearMainContent();

      skt.kekkaInput.configModule(obj);
      skt.kekkaInput.initModule( jqueryMap.$content );
    }
  }

  //---ユーティリティメソッド---
  copyAnchorMap = function () {
    // $.extendはマージ。第2引数へ第3引数をマージする。
    // 第1引数のtrueはディープコピーを意味する。
    return $.extend( true, {}, stateMap.anchor_map );
  }

  // それ以前の履歴が残らないようにするには replace_flag を true にする。
  // option_map は null でよい。
  // 通常の使用では arg_map のみ渡せばよい。
  changeAnchorPart = function ( arg_map, option_map = null, replace_flag = false ) {
    var anchor_map_revise = copyAnchorMap(),
        bool_return = true,
        key_name, key_name_dep;

    // アンカーマップへ変更を統合
    KEYVAL:
    for ( key_name in arg_map ) {
      if ( arg_map.hasOwnProperty( key_name ) ) {
        // 反復中に従属キーを飛ばす
        if ( key_name.indexOf( '_' ) === 0 ) { continue KEYVAL; }

        // 独立キーを更新する
        anchor_map_revise[key_name] = arg_map[key_name];

        // 合致する独立キーを更新する
        key_name_dep = '_' + key_name;
        if ( arg_map[key_name_dep] ) {
          anchor_map_revise[key_name_dep] = arg_map[key_name_dep];
        } else {
          delete anchor_map_revise[key_name_dep];
          delete anchor_map_revise['_s' + key_name_dep];
        }
      }
    }

    //uriの更新開始。成功しなければ元に戻す
    try {
      $.uriAnchor.setAnchor( anchor_map_revise, option_map, replace_flag );
    } catch {
      // uriを既存の状態に置き換える
      $.uriAnchor.setAnchor( stateMap.anchor_map, null, true );
      bool_return = false;
    }

    return bool_return;
  }

  // flg:trueで呼ぶと、ダイアログ以外はタッチ無効
  // flg:falseで呼ぶと有効に戻る。
  setModal = function ( flg ) {
    let setModalconfig;

    if ( flg == true ) {
      setModalconfig = 'none';
    } else {
      setModalconfig = 'auto';
    }
    //クリックイベント等を有効化or無効化
    jqueryMap.$acct.css('pointer-events', setModalconfig);
    jqueryMap.$menu.css('pointer-events', setModalconfig);
    jqueryMap.$content.css('pointer-events', setModalconfig);
  }

  // 生徒の様子メモを登録する
  // どのモジュールに持たせるか迷うが、ここに入れておく
  inputStudentMemo = function (memo) {
    if (memo != "") {
      stateMap.studentMemo.memo = memo;
      skt.model.updateStudentMemo(stateMap.studentMemo);
    }
  }

  // 生徒の様子メモを削除する
  deleteStudentMemo = function () {
    skt.model.deleteStudentMemo(stateMap.delMemo);
  }

  //---パブリックメソッド---
  initModule = function ( $container ) {

    stateMap.$container = $container; //ここで渡されるのはskt全体
    $container.html( configMap.main_html );
    setJqueryMap();

    // 許容されるuriアンカーの型を指定
    $.uriAnchor.configModule ({
      schema_map : configMap.anchor_schema_map
    });

    //version 表示
    jqueryMap.$title.html( configMap.titleStr + ' ' + skt.appVersion.show() );

    // 出欠の入力をする際に過去の情報を表示->修正->登録のあと、
    // さっき表示してた日に戻りたい。よって、機能モジュールでなく、shellで日付を持つ。
    resetDate();

    // 以降、各種イベント処理の登録
    // ログインダイアログ表示
    $.gevent.subscribe( $container, 'tryLogin', function (event, msg_map) {
      changeAnchorPart({
        status : 'dialog',
        _status : {
          dialogKind : 'login'
        }
      });
    });

    // ダイアログ消去
    $.gevent.subscribe( $container, 'cancelDialog', function (event, msg_map) {
      changeAnchorPart({
        status : 'matiuke'
      });
    });

    // ログイン成功
    $.gevent.subscribe( $container, 'loginSuccess', function (event, msg_map) {

      // 設計上、これらはonHashchangeで処理すべきだが、そのためには
      // なぜダイアログを閉じたのかという情報が必要になり面倒。いい案を考える。
      skt.acct.configModule({showStr : msg_map.name});
      skt.acct.initModule( jqueryMap.$acct );
      skt.menu.configModule({userKind:skt.model.getUserKind()});
      skt.menu.initModule( jqueryMap.$menu );

      changeAnchorPart({
        status : 'matiuke'
      }, null, true); //ログイン前には戻したくないので、履歴を消去
    });

    // ログイン失敗
    $.gevent.subscribe( $container, 'loginFailure', function (event, msg_map) {
      //履歴には残さず、しれっとダイヤログを書き直してやり直しさせる。
      skt.dialog.removeDialog();
      skt.dialog.configModule({});
      skt.dialog.initModule( jqueryMap.$container );
    });

    // ログアウトダイアログ表示
    $.gevent.subscribe( $container, 'tryLogout', function (event, msg_map) {
      changeAnchorPart({
        status : 'dialog',
        _status : {
          dialogKind : 'logout'
        }
      });
    });

    // ログアウト成功
    $.gevent.subscribe( $container, 'logoutSuccess', function (event, msg_map) {
      // 設計上、これらはonHashchangeで処理すべきだが、そのためには
      // なぜダイアログを閉じたのかという情報が必要になり面倒。いい案を考える。
      skt.acct.configModule({showStr : "ログインする"});
      skt.acct.initModule( jqueryMap.$acct );
      skt.menu.removeMenu();
      skt.touroku.removeTouroku();
      skt.renraku.removeRenraku();
      skt.clsTotal.removeClsTotal();
      skt.schoolTotal.removeSchoolTotal();
      skt.changePass.removeChangePass();
      skt.proxy.removeProxy();
      skt.kekka.removeKekka();
      skt.kekkaJikanwari.removeKekkaJikanwari();
      skt.kekkaJyugyou.removeKekkaJyugyou();
      skt.kekkaInput.removeKekkaInput();

    changeAnchorPart({
      status : 'matiuke'
      }, null, true); //ログイン前には戻したくないので、履歴を消去
    });

    // ログアウト失敗
    $.gevent.subscribe( $container, 'logoutFailure', function (event, msg_map) {
      //どうする？
    });

    // メニュー1(出席連絡(事務))選択など
    $.gevent.subscribe( $container, 'readyAllClassComplete', function (event, msg_map) {

      if ( msg_map.clientState == 'jimu' ) {
        changeAnchorPart({
           status : 'jimurenraku'
        });
      } else if ( msg_map.clientState == 'schoolTotal' ) {
        let today = new Date();

        stateMap.skYear = today.getFullYear();
        stateMap.skMonth = today.getMonth() + 1; //月だけ0始まり
        stateMap.skDay = today.getDate();

        skt.model.readyTodayAll( msg_map.clientState ); // 準備はまだ終わらない
                                   // readyTodayAll  が終わると readySyukketsuResult
                                   // がくる。
      } else if ( msg_map.clientState == 'proxy' ) {
        changeAnchorPart({
          status : 'proxy'
        });
      }
    });

    // 主にメニュー2(出席入力(担任))選択後のクラス名簿準備完了
    $.gevent.subscribe( $container, 'setTargetClassResult', function (event, msg_map) {

      // クラス情報を取得できないダイアログ
      if ( msg_map.result == false ) {
        stateMap.errStr = 'クラス情報を取得できません';
        changeAnchorPart({
          status : 'dialog',
          _status : {
            dialogKind : 'invalid'
          }
        });

      // データが取れてれば、出欠の入力の準備
      } else {
        skt.model.readySyukketsu(msg_map.clientState);
      }
    });

    // 出欠入力準備完了
    $.gevent.subscribe( $container, 'readySyukketsuResult', function (event, msg_map) {

      // 出欠入力(担任)
      if ( msg_map.clientState == 'input' ) {
        changeAnchorPart({
          status : 'inputSyukketsu',
          _status : {
            year  : stateMap.skYear,
            month : stateMap.skMonth,
            day   : stateMap.skDay,
            mode  : 'normal'
          }
        });

      // 出欠確認(担任)
      } else if ( msg_map.clientState == 'count' ) {
        let today = new Date(),
            y = today.getFullYear(),
            m = today.getMonth() + 1; //月だけ0始まり

        // 年度内だけど年が変わってるかもしれない
        if ( m == 1 || m == 2 || m == 3 ) {
          y--;
        }
        changeAnchorPart({
          status : 'clsTotal',
          _status : {
            sYear  : y, // とりあえず開始は年度の初めにしとく。
            sMonth : 4,
            sDay   : 1,
            eYear  : today.getFullYear(),
            eMonth : today.getMonth() + 1, //月だけ0始まり
            eDay   : today.getDate()
          }
        });

      // 出欠確認(全体)
      } else if ( msg_map.clientState == 'schoolTotal' ) {
        changeAnchorPart({
           status : 'schoolTotal',
           _status : {
             year  : stateMap.skYear,
             month : stateMap.skMonth,
             day   : stateMap.skDay
           }
        });

      // 欠課入力における欠課の詳細(出停中の欠課のカウント)
      } else if ( msg_map.clientState == 'kekka' ) {
        skt.kekkaInput.readyDetailCompletion();
      }
    });

    // 出欠更新確認
    $.gevent.subscribe( $container, 'verifySkUpdate', function (event, msg_map) {
      changeAnchorPart({
        status : 'dialog',
        _status : {
          dialogKind : 'verifySkUpdate'
        }
      });
    });

    // 出欠入力日変更
    $.gevent.subscribe( $container, 'inputSkDayChange', function (event, msg_map) {

      stateMap.skYear  = msg_map.year;
      stateMap.skMonth = msg_map.month;
      stateMap.skDay   = msg_map.day;

      changeAnchorPart({
        status : 'inputSyukketsu',
        _status : {
          year  : stateMap.skYear,
          month : stateMap.skMonth,
          day   : stateMap.skDay,
          mode  : msg_map.mode
        }
      });
    });

    // 学校集計日変更
    $.gevent.subscribe( $container, 'schoolTotalDayChange', function (event, msg_map) {

      stateMap.skYear = msg_map.year;
      stateMap.skMonth = msg_map.month;
      stateMap.skDay = msg_map.day;

      skt.model.readyTodayAll('schoolTotal',
                              stateMap.skYear,
                              stateMap.skMonth - 1 , //月だけ0始まり
                              stateMap.skDay);
    });

    // メニュー1(出席連絡(事務))選択 での登録
    $.gevent.subscribe( $container, 'verifyInsertRenraku', function (event, msg_map) {
      changeAnchorPart({
        status : 'dialog',
        _status : {
          dialogKind : 'verifyRkInsert'
        }
      });
    });

    // メニュー1(出席連絡(事務))選択 での登録完了
    $.gevent.subscribe( $container, 'insertRenrakuResult', function (event, msg_map) {
      changeAnchorPart({
        status : 'jimurenraku'
      });
    });

    // 入力値不正ダイアログ
    $.gevent.subscribe( $container, 'invalidInput', function (event, msg_map) {
      stateMap.errStr = msg_map.errStr;
      changeAnchorPart({
        status : 'dialog',
        _status : {
          dialogKind : 'invalid'
        }
      });
    });

    // 出欠再計算
    $.gevent.subscribe( $container, 'reCalc', function (event, msg_map) {
      changeAnchorPart({
        status : 'clsTotal',
        _status : {
          sYear  : msg_map.sy,
          sMonth : msg_map.sm,
          sDay   : msg_map.sd,
          eYear  : msg_map.ey,
          eMonth : msg_map.em,
          eDay   : msg_map.ed
        }
      });
    });

    // 事務連絡削除
    $.gevent.subscribe( $container, 'delRenraku', function (event, msg_map) {
      stateMap.errStr = msg_map.name;
      changeAnchorPart({
        status : 'dialog',
        _status : {
          dialogKind  : 'delRenraku'
        }
      });
    });

    // 事務連絡削除 完了
    $.gevent.subscribe( $container, 'deleteRenrakuComplete', function (event, msg_map) {
      // 更新したら、読み直す。
      skt.model.readyTodayAll('schoolTotal',
                              stateMap.skYear,
                              stateMap.skMonth - 1 , //月だけ0始まり
                              stateMap.skDay);
    });

    // 切断や他端末でのログイン
    $.gevent.subscribe( $container, 'anotherLogin', function (event, msg_map) {
      changeAnchorPart({
        status : 'dialog',
        _status : {
          dialogKind  : 'anotherLogin'
        }
      }, null, true); //ログアウト前には戻したくないので、履歴を消去
    });

    // パスワード変更
    $.gevent.subscribe( $container, 'changePassWord', function (event, msg_map) {
      changeAnchorPart({
        status : 'changePass'
      });
    });

    // パスワード変更前確認
    $.gevent.subscribe( $container, 'verifyChgPass', function (event, msg_map) {
      changeAnchorPart({
        status : 'dialog',
        _status : {
          dialogKind  : 'verifyChgPass'
        }
      })
    });

    // パスワード変更成功
    $.gevent.subscribe( $container, 'changePassSuccess', function (event, msg_map) {
      stateMap.errStr = 'パスワードの変更に成功しました';
      changeAnchorPart({
        status : 'dialog',
        _status : {
          dialogKind : 'noInvalid'
        }
      });
    });

    // パスワード変更失敗
    $.gevent.subscribe( $container, 'changePassFailure', function (event, msg_map) {
      stateMap.errStr = 'パスワードの変更に失敗しました';
      changeAnchorPart({
        status : 'dialog',
        _status : {
          dialogKind : 'invalid'
        }
      });
    });

    // 日課設定
    $.gevent.subscribe( $container, 'inputNikka', function (event, msg_map) {
      if (msg_map != null && msg_map.year) {
        stateMap.skYear  = msg_map.year;
        stateMap.skMonth = msg_map.month;
        stateMap.skDay   = msg_map.day;
      }

      changeAnchorPart({
        status : 'calendar',
        _status : {
          year  : stateMap.skYear,
          month : stateMap.skMonth,
          day   : stateMap.skDay
        }
      });
    });

    // 日課登録確認
    $.gevent.subscribe( $container, 'verifyClUpdate', function (event, msg_map) {
      stateMap.errStr = msg_map.errStr;
      changeAnchorPart({
        status : 'dialog',
        _status : {
          dialogKind  : 'verifyClUpdate'
        }
      });
    });

    // 欠課入力(管理画面)
    $.gevent.subscribe( $container, 'kekka', function (event, msg_map) {
      if (msg_map != null && msg_map.year) {
        stateMap.skYear  = msg_map.year;
        stateMap.skMonth = msg_map.month;
        stateMap.skDay   = msg_map.day;
      }

      // 指定がなければnormal
      if (Object.keys(msg_map).indexOf('mode') == -1) {
        msg_map.mode = 'normal';
      }

      changeAnchorPart({
        status : 'kekka',
        _status : {
          year  : stateMap.skYear,
          month : stateMap.skMonth,
          day   : stateMap.skDay,
          mode  : msg_map.mode
        }
      });
    });

    // 時間割の設定
    $.gevent.subscribe( $container, 'setJikanwari', function (event, msg_map) {
      changeAnchorPart({
        status : 'setJikanwari'
      });
    });

    // 時間割登録確認
    $.gevent.subscribe( $container, 'verifyJKWUpdate', function (event, msg_map) {
      stateMap.errStr = msg_map.errStr;
      changeAnchorPart({
        status : 'dialog',
        _status : {
          dialogKind  : 'verifyJKWUpdate'
        }
      });
    });

    // 授業登録確認
    $.gevent.subscribe( $container, 'verifyJGYUpdate', function (event, msg_map) {
      stateMap.errStr = msg_map.errStr;
      changeAnchorPart({
        status : 'dialog',
        _status : {
          dialogKind  : 'verifyJGYUpdate'
        }
      });
    });

    // 欠課登録確認
    $.gevent.subscribe( $container, 'verifyKKUpdate', function (event, msg_map) {
      changeAnchorPart({
        status : 'dialog',
        _status : {
          dialogKind  : 'verifyKKUpdate'
        }
      });
    });

    // 欠課入力(入力画面)
    $.gevent.subscribe( $container, 'kekkaInput', function (event, msg_map) {
      if (msg_map != null && msg_map.year) {
        stateMap.skYear  = msg_map.year;
        stateMap.skMonth = msg_map.month;
        stateMap.skDay   = msg_map.day;
        stateMap.koma    = msg_map.koma;
        stateMap.jyugyouId = msg_map.jyugyouId;
        stateMap.mode    = msg_map.mode;
      }

      changeAnchorPart({
        status : 'kekkaInput',
        _status : {
          year  : stateMap.skYear,
          month : stateMap.skMonth,
          day   : stateMap.skDay,
          koma  : stateMap.koma,
          jyugyouId : stateMap.jyugyouId,
          mode  : stateMap.mode
        }
      });
    });

    // 授業削除確認(なし->完全削除)
    $.gevent.subscribe( $container, 'verifyJGYDelete', function (event, msg_map) {
      stateMap.errStr = msg_map.errStr;
      changeAnchorPart({
        status : 'dialog',
        _status : {
          dialogKind  : 'verifyJGYDelete'
        }
      });
    });

    // 授業削除確認(あり->なし)
    $.gevent.subscribe( $container, 'kekkaReason', function (event, msg_map) {
      stateMap.errStr = msg_map.detailStr;
      changeAnchorPart({
        status : 'dialog',
        _status : {
          dialogKind  : 'kekkaReason'
        }
      });
    });

    // 生徒の様子メモ入力画面
    $.gevent.subscribe( $container, 'studentMemo', function (event, msg_map) {

      stateMap.studentMemo = { year      : msg_map.year,
                               month     : msg_map.month,
                               day       : msg_map.day,
                               gakunen   : msg_map.gakunen,
                               cls       : msg_map.cls,
                               bangou    : msg_map.bangou };

      stateMap.errStr = msg_map.detailStr;

      changeAnchorPart({
        status : 'dialog',
        _status : {
          dialogKind  : 'studentMemo'
        }
      });
    });

    // 生徒の様子登録完了
    $.gevent.subscribe( $container, 'updateStudentMemoResult', function (event, msg_map) {
      changeAnchorPart({
        status : 'matiuke'
      });
    });

    // 生徒の様子メモ削除画面
    $.gevent.subscribe( $container, 'delStudentMemo', function (event, msg_map) {

      stateMap.delMemo = { year      : msg_map.year,
                           month     : msg_map.month,
                           day       : msg_map.day,
                           gakunen   : msg_map.gakunen,
                           cls       : msg_map.cls,
                           bangou    : msg_map.bangou,
                           memo      : msg_map.memo };

      stateMap.errStr = msg_map.showStr;

      changeAnchorPart({
        status : 'dialog',
        _status : {
          dialogKind  : 'delStudentMemo'
        }
      });
    });

    // 生徒の様子削除完了
    $.gevent.subscribe( $container, 'deleteStudentMemoResult', function (event, msg_map) {
      changeAnchorPart({
        status : 'matiuke'
      });
    });

    // 合同名簿取得完了
    $.gevent.subscribe( $container, 'getMeiboIdListResult', function (event, msg_map) {
      changeAnchorPart({
        status : 'setJyugyou'
      });
    });

    skt.acct.configModule({showStr : 'ログインする'});
    skt.acct.initModule( jqueryMap.$acct );

    $(window)
      .bind( 'hashchange', onHashchange )
      .trigger( 'hashchange' );
  }

  // 入力対象の日付を今日に戻す
  resetDate = function () {
    let today = new Date();

    stateMap.skYear  = today.getFullYear();
    stateMap.skMonth = today.getMonth() + 1; //月だけ0始まり
    stateMap.skDay   = today.getDate();
  }

  return { initModule : initModule,
           resetDate  : resetDate };
}());
