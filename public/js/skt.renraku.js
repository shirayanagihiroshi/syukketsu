/*
 * skt.renraku.js
 * 出欠連絡モジュール
 */
skt.renraku = (function () {
  'use strict';

  // todo
  // 出欠連絡から担任入力に遷移して、再度出欠連絡にもどるとドロップダウンの名簿がバグる。

  //---モジュールスコープ変数---
  var configMap = {
        main_html : String()
          + '<div class="skt-renraku-today">today</div>'
          + '<div class="skt-renraku-gakunen-title">学年</div>'
          + '<select class="skt-renraku-gakunen">'
          + '<option value="1">中学1年</option>'
          + '<option value="2">中学2年</option>'
          + '<option value="3">中学3年</option>'
          + '<option value="4">高校1年</option>'
          + '<option value="5">高校2年</option>'
          + '<option value="6">高校3年</option>'
          + '</select>'
          + '<div class="skt-renraku-cls-title">組</div>'
          + '<select class="skt-renraku-cls">'
          + '</select>'
          + '<div class="skt-renraku-members-title">氏名</div>'
          + '<select class="skt-renraku-members">'
          + '</select>'
          + '<table class="skt-renraku-main"></table>'
          + '<input class="skt-renraku-insert" type="button" value="登録">'
          + '<div class="skt-renraku-notice">※生徒を選択してから、内容をチェックしてください。</dev>',
        settable_map : {},
        allMeibo : {}
      },
      stateMap = {
        $container             : null,
        dropDownListPosCls     : 1,  // リストを操作し登録対象の生徒を選ぶ時に使う
        targetSyussekibangou   : 0,  // リストを操作し登録対象の生徒を選ぶ時に使う
        targetName             : "", // リストを操作し登録対象の生徒を選ぶ時に使う
        target                 : {}  // チェック済の登録対象
      },
      jqueryMap = {},
      setJqueryMap, configModule, initModule, removeRenraku,
      setDropDownList, createTable, setDayButtons, verify, onUpdate;

  //---DOMメソッド---
  setJqueryMap = function () {
    var $container = stateMap.$container;
    jqueryMap = {
      $container    : $container,
      $today        : $container.find( '.skt-renraku-today' ),
      $gakunenlistT : $container.find( '.skt-renraku-gakunen-title' ),
      $gakunenlist  : $container.find( '.skt-renraku-gakunen' ),
      $clslistT     : $container.find( '.skt-renraku-cls-title' ),
      $clslist      : $container.find( '.skt-renraku-cls' ),
      $memberlistT  : $container.find( '.skt-renraku-members-title' ),
      $memberlist   : $container.find( '.skt-renraku-members' ),
      $main         : $container.find( '.skt-renraku-main' ),
      $notice       : $container.find( '.skt-renraku-notice' ),
      $insert       : $container.find( '.skt-renraku-insert' )
    };
  }

  //---イベントハンドラ---
  verify = function () {
    // 入力値を全て取得
    let retObj, allData = $('.skt-renraku-main').find('tr'),
        updataArr = [];

    // 0行目がヘッダ
    // 1行目が内容
    retObj = skt.model.skTable2obj(allData[1]);

    // 入力が正常なら登録処理へ
    if ( retObj.result == 1 ) {
      stateMap.target = retObj.updateObj;
      $.gevent.publish('verifyInsertRenraku', [{}]);

    // チェックに異常があれば
    // エラーダイアログを出す。
    } else if ( retObj.result == 0 ) {
      $.gevent.publish('invalidInput', [{errStr:'チェックがありません'}]);
    } else if ( retObj.result == 2 ) {
      $.gevent.publish('invalidInput', [{errStr:retObj.errStr}]);
    }
  }

  onUpdate = function () {
    let today = new Date();

    // syukketsu collection と renraku collection はデータの持ち方が違う
    // ただ、内容に直接アクセスしすぎ。もうちょいモデルで面倒をみるべき
    stateMap.target.gakunen = Number( jqueryMap.$gakunenlist.val() );
    stateMap.target.cls     = Number( jqueryMap.$clslist.val() );
    stateMap.target.year    = today.getFullYear();
    stateMap.target.month   = today.getMonth() + 1; // 月だけ0始まり
    stateMap.target.day     = today.getDate();
    stateMap.target.name    = stateMap.targetName;

    // 登録処理
    skt.model.insertRenraku( stateMap.target );
  }


  //---ユーティリティメソッド---

  // 学園、組を指定して、組、生徒のドロップダウンリストを更新する。
  // ダサいが最初だけ、initflgを立てる。
  setDropDownList = function ( gakunen, cls , initflg = false) {
    let i, cl, ml, clsNotExist = false;

    // 学年
    jqueryMap.$gakunenlist.val( gakunen );

    // クラスのリスト
    // 削除する前に位置を保持
    if ( initflg != true ) {
      stateMap.dropDownListPosCls = Number( jqueryMap.$clslist.val() );
    }
    // 一旦リストを削除消して
    jqueryMap.$clslist.children().remove();
    // 設定しなおす
    cl = skt.model.getClsList( configMap.allMeibo, gakunen);
    for (i = 0; i < cl.length ; i++) {
      jqueryMap.$clslist.append($('<option>').val(cl[i]).html(
        skt.model.showCls(gakunen, cl[i])));
    }
    // その後、位置を復元
    if ( stateMap.dropDownListPosCls <= cl.length ) {
      jqueryMap.$clslist.val( stateMap.dropDownListPosCls );
    } else {
      clsNotExist = true;
      jqueryMap.$clslist.val(1);
    }

    // 生徒のリスト
    // 一旦リストを削除消して
    jqueryMap.$memberlist.children().remove();
    // 該当クラスのリストを設定しなおす
    ml = skt.model.getMemberList( configMap.allMeibo, gakunen, clsNotExist ? 1 : cls );
    for (i = 0; i < ml.students.length ; i++) {
      jqueryMap.$memberlist.append($('<option>').val(ml.students[i].bangou).html(
        String(ml.students[i].bangou) + '番 ' + ml.students[i].name));
    }
    jqueryMap.$memberlist.val(1);
    stateMap.targetSyussekibangou = ml.students[0].bangou;
    stateMap.targetName           = ml.students[0].name;
  }

  createTable = function (bangou, name) {
    let str, tablePart,
    clsSyukketsu = '<td class="skt-renraku-edi skt-renraku-sk">',
    clsKouketsu  = '<td class="skt-renraku-edi skt-renraku-kk">',
    clsReason    = '<td class="skt-renraku-edi skt-renraku-re">',
    clsMemo      = '<td class="skt-renraku-edimemo">';

    jqueryMap.$main.append(skt.model.getSkTableHeader());

    // DBの持つ理由の種別との対応を一致させるためヘッダはモデルに持たせた。
    // テーブルとの変換もモデルでやる。
    tablePart = skt.model.readySkTable([], 1, clsSyukketsu, clsKouketsu, clsReason, clsMemo);

    str = '<tr>';
    str += '<td>' + String(bangou) + '</td>';
    str += '<td>' + name + '</td>';
    str += tablePart;
    str += '</tr>';
    jqueryMap.$main.append(str);

    // 重複して登録すると、何度もイベントが発行される。それを避けるため、一旦削除
    $(document).off('click');
    $(document).off('blur');

    // 出欠または理由が選択されたらON/OFFする。
    $(document).on('click', '.skt-renraku-edi', function (event) {
      let beforeVal = $(this).html();

      if (beforeVal == '1') {
        $(this).html("");
      } else {
        $(this).html('1');
      }
    });

    // memoがクリックされたらテキストボックスを用意する
    $(document).on('click', '.skt-renraku-edimemo', function (event) {
      var temp = $(this).text(),
          more = $('.hoge').val(); // テキストボックスをさらにクリックしたときに
                                   // 入力テキストが消える対応
      if (more != null) {
        temp += more;
      }
      $(this).html('<input class="hoge" type="text" value="' + temp + '">');

      $('.hoge').focus();
    });

    //テキストボックスからフォーカスが外れたら入力されていた値をセルに設定する
    $(document).on('blur', '.hoge', function () {

      $('.hoge').parent().html($('.hoge').val());

    });
  }

  setDayButtons = function () {
    // 本日
    jqueryMap.$today.html(skt.util.makeDateStr() + 'の出欠連絡');
  }


  //---パブリックメソッド---
  configModule = function ( input_map ) {
    skt.util.setConfigMap({
      input_map : input_map,
      settable_map : configMap.settable_map,
      config_map : configMap
    });
    return true;
  }

  initModule = function ( $container ) {
    $container.html( configMap.main_html );
    stateMap.$container = $container;
    setJqueryMap();

    configMap.allMeibo = skt.model.getAllClass();

   // 出欠連絡(事務)中に出欠入力(担任)をしてまた出欠連絡(事務)に戻ると
   // ドロップダウンがバグるので初期化しておく。
    stateMap.dropDownListPosCls = 1;

    // とりあえず高校1年1組を表示
    setDropDownList(4, 1, true);

    jqueryMap.$gakunenlist.change( function () {
      setDropDownList( Number( jqueryMap.$gakunenlist.val() ),
                       Number( jqueryMap.$clslist.val() ) );
      // 一旦テーブルも削除して作り直し
      jqueryMap.$main.children().remove();
      createTable(stateMap.targetSyussekibangou, stateMap.targetName);
    });

    jqueryMap.$clslist.change(function () {
      setDropDownList( Number( jqueryMap.$gakunenlist.val() ),
                       Number( jqueryMap.$clslist.val() ) );
      // 一旦テーブルも削除して作り直し
      jqueryMap.$main.children().remove();
      createTable(stateMap.targetSyussekibangou, stateMap.targetName);
    });

    jqueryMap.$memberlist.change( function () {
      let ml, p, f = function (b) {
        return function (target) {
          if ( target.bangou == b ) {
            return true;
          }
        };
      };

      ml = skt.model.getMemberList( configMap.allMeibo,
                                    Number( jqueryMap.$gakunenlist.val() ),
                                    Number( jqueryMap.$clslist.val() ) );

      p = ml.students.find( f( Number( jqueryMap.$memberlist.val() ) ) );
      stateMap.targetSyussekibangou = p.bangou;
      stateMap.targetName           = p.name;

      jqueryMap.$main.children().remove();
      createTable(stateMap.targetSyussekibangou, stateMap.targetName);
    });

    createTable(stateMap.targetSyussekibangou, stateMap.targetName);
    setDayButtons();

    jqueryMap.$insert
      .click( verify );

    return true;
  }

  removeRenraku = function ( ) {
    //初期化と状態の解除
    if ( jqueryMap != null ) {
      if ( jqueryMap.$container ) {
        jqueryMap.$today.remove();
        jqueryMap.$gakunenlistT.remove();
        jqueryMap.$gakunenlist.remove();
        jqueryMap.$clslistT.remove();
        jqueryMap.$clslist.remove();
        jqueryMap.$memberlistT.remove();
        jqueryMap.$memberlist.remove();
        jqueryMap.$main.remove();
        jqueryMap.$notice.remove();
        jqueryMap.$insert.remove();
      }
    }
    return true;
  }

  return {
    configModule  : configModule,
    initModule    : initModule,
    removeRenraku : removeRenraku,
    Update        : onUpdate
  };
}());
