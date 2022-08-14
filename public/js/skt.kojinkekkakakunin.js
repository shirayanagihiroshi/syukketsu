/*
 * skt.kojinkekkakakunin.js
 * 個人の欠課確認モジュール
 */
skt.kojinkekkakakunin = (function () {
  'use strict';

  //---モジュールスコープ変数---
  var configMap = {
        main_html : String()
          + '<div class="skt-kojinkekkakakunin-gakunen-title">学年</div>'
          + '<select class="skt-kojinkekkakakunin-gakunen">'
          + '<option value="1">中学1年</option>'
          + '<option value="2">中学2年</option>'
          + '<option value="3">中学3年</option>'
          + '<option value="4">高校1年</option>'
          + '<option value="5">高校2年</option>'
          + '<option value="6">高校3年</option>'
          + '</select>'
          + '<div class="skt-kojinkekkakakunin-cls-title">組</div>'
          + '<select class="skt-kojinkekkakakunin-cls">'
          + '</select>'
          + '<div class="skt-kojinkekkakakunin-members-title">氏名</div>'
          + '<select class="skt-kojinkekkakakunin-members">'
          + '</select>'
          + '<input class="skt-kojinkekkakakunin-show" type="button" value="表示">'
          + '<div class="skt-kojinkekkakakunin-notice"></div>'
          + '<table class="skt-kojinkekkakakunin-main"></table>',
        settable_map : {},
        allMeibo : {}
      },
      stateMap = {
        $container             : null,
        dropDownListPosCls     : 1,  // リストを操作し登録対象の生徒を選ぶ時に使う
        target                 : {}  // 確認の対象
      },
      jqueryMap = {},
      setJqueryMap, configModule, initModule, removeKojinkekkakakunin,
      setDropDownList, createTable, onShow;

  //---DOMメソッド---
  setJqueryMap = function () {
    var $container = stateMap.$container;
    jqueryMap = {
      $container    : $container,
      $gakunenlistT : $container.find( '.skt-kojinkekkakakunin-gakunen-title' ),
      $gakunenlist  : $container.find( '.skt-kojinkekkakakunin-gakunen' ),
      $clslistT     : $container.find( '.skt-kojinkekkakakunin-cls-title' ),
      $clslist      : $container.find( '.skt-kojinkekkakakunin-cls' ),
      $memberlistT  : $container.find( '.skt-kojinkekkakakunin-members-title' ),
      $memberlist   : $container.find( '.skt-kojinkekkakakunin-members' ),
      $show         : $container.find( '.skt-kojinkekkakakunin-show' ),
      $notice       : $container.find( '.skt-kojinkekkakakunin-notice'),
      $main         : $container.find( '.skt-kojinkekkakakunin-main' )
    };
  }

  //---イベントハンドラ---
  onShow = function () {
    let ml, p, f = function (b) {
      return function (target) {
        if ( target.bangou == b ) {
          return true;
        }
      };
    };

    stateMap.target.gakunen = Number( jqueryMap.$gakunenlist.val() );
    stateMap.target.cls     = Number( jqueryMap.$clslist.val() );
    stateMap.target.bangou  = Number( jqueryMap.$memberlist.val() );

    ml = skt.model.getMemberList( configMap.allMeibo,
                                  stateMap.target.gakunen ,
                                  stateMap.target.cls );

    p = ml.students.find( f( stateMap.target.bangou ) );
    stateMap.target.name    =  p.name;

    // 表示
    jqueryMap.$notice.html(stateMap.target.name + 'の欠課は');
    createTable(stateMap.target.gakunen, stateMap.target.cls, stateMap.target.bangou);
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
  }

  createTable = function (gakunen, cls, bangou) {
    let str;

    str = '<tr>';
    str += '<td>' + 'hoge' + '</td>';
    str += '<td>' + 'hoge' + '</td>';
    str += '<td>' + 'hoge' + '</td>';
    str += '</tr>';
    jqueryMap.$main.append(str);

    str = '<tr>';
    str += '<td>' + 'hoge' + '</td>';
    str += '<td>' + 'hoge' + '</td>';
    str += '<td>' + 'hoge' + '</td>';
    str += '</tr>';
    jqueryMap.$main.append(str);

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
    });

    jqueryMap.$clslist.change(function () {
      setDropDownList( Number( jqueryMap.$gakunenlist.val() ),
                       Number( jqueryMap.$clslist.val() ) );
    });

    jqueryMap.$show
      .click( onShow );

    return true;
  }

  removeKojinkekkakakunin = function ( ) {
    //初期化と状態の解除
    if ( jqueryMap != null ) {
      if ( jqueryMap.$container ) {
        jqueryMap.$gakunenlistT.remove();
        jqueryMap.$gakunenlist.remove();
        jqueryMap.$clslistT.remove();
        jqueryMap.$clslist.remove();
        jqueryMap.$memberlistT.remove();
        jqueryMap.$memberlist.remove();
        jqueryMap.$show.remove();
        jqueryMap.$main.remove();
      }
    }
    return true;
  }

  return {
    configModule  : configModule,
    initModule    : initModule,
    removeKojinkekkakakunin : removeKojinkekkakakunin
  };
}());
