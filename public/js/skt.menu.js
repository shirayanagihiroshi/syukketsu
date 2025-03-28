/*
 * skt.menu.js
 * メニュー部モジュール
 */
skt.menu = (function () {
  'use strict';

  //---モジュールスコープ変数---
  var configMap = {
        main_html1 : String()
          + '<div class="skt-menu1">パスワード変更</div>'
          + '<div class="skt-menu2">出欠連絡(事務)</div>'
          + '<div class="skt-menu3">出欠確認(全体)</div>',
        main_html2 : String()
          + '<div class="skt-menu4">欠課入力</div>'
          + '<div class="skt-menu5">個人の欠課確認</div>',
        main_html3 : String()
          + '<div class="skt-menu6">出欠入力(担任)</div>'
          + '<div class="skt-menu7">出欠確認(担任)</div>',
        main_html4 : String()
          + '<div class="skt-menu8">代理で出欠(教務)</div>'
          + '<div class="skt-menu9">日課の入力(教務)</div>'
          + '<div class="skt-menu10">休学の入力(教務)</div>'
          + '<div class="skt-menu11">合同名簿登録(教務)</div>',
        settable_map : {userKind : true},
        userKind : 8  // 8  事務 (8から始まってることに特に意味はない)
                      // 9  非常勤教諭
                      // 10 常勤教諭
                      // 11 教務部
      },
      stateMap = {
        $container : null
      },
      jqueryMap = {},
      setJqueryMap, configModule, initModule, removeMenu, onClickMenu1,
      onClickMenu2, onClickMenu3, onClickMenu4, onClickMenu5, onClickMenu6,
      onClickMenu7, onClickMenu8, onClickMenu9, onClickMenu10, onClickMenu11,
      setColor;

  //---DOMメソッド---
  setJqueryMap = function () {
    var $container = stateMap.$container;
    jqueryMap = {
      $container : $container,
      $menu1     : $container.find( '.skt-menu1' ),
      $menu2     : $container.find( '.skt-menu2' ),
      $menu3     : $container.find( '.skt-menu3' )
    };
    if ( configMap.userKind == 9 || configMap.userKind == 10 || configMap.userKind == 11  ) {
      jqueryMap.$menu4 = $container.find( '.skt-menu4' );
      jqueryMap.$menu5 = $container.find( '.skt-menu5' );
    }
    if ( configMap.userKind == 10 || configMap.userKind == 11 ) {
      jqueryMap.$menu6 = $container.find( '.skt-menu6' );
      jqueryMap.$menu7 = $container.find( '.skt-menu7' );
    }
    if ( configMap.userKind == 11 ) {
      jqueryMap.$menu8 = $container.find( '.skt-menu8' );
      jqueryMap.$menu9 = $container.find( '.skt-menu9' );
      jqueryMap.$menu10 = $container.find( '.skt-menu10' );
      jqueryMap.$menu11 = $container.find( '.skt-menu11' );
    }
  }

  //---イベントハンドラ---
  // パスワード変更
  onClickMenu1 = function () {
    //console.log('onClickMenu1');
    setColor(1);
    $.gevent.publish('changePassWord', [{}]);
    return false;
  }
  // 出欠連絡(事務)
  onClickMenu2 = function () {
    //console.log('onClickMenu2');
    setColor(2);
    // 全体の名簿は通常変わらないから、モデルは取得済なら問い合わせをせず完了する
    skt.model.readyAllClass('jimu');
    return false;
  }
  // 出欠確認(全体)
  onClickMenu3 = function () {
    //console.log('onClickMenu3');
    setColor(3);
    skt.shell.resetDate(); //日付がずれたままだど使いにくいので、メニューを押したら今日に戻す
    // 全体の名簿は通常変わらないから、モデルは取得済なら問い合わせをせず完了する
    skt.model.readyAllClass('schoolTotal');
    return false;
  }
  // 欠課入力
  onClickMenu4 = function () {
    //console.log('onClickMenu4');
    setColor(4);
    skt.shell.resetDate(); //日付がずれたままだど使いにくいので、メニューを押したら今日に戻す
    // 欠課データを取得
    skt.model.readyKekka('init');
    return false;
  }
  // 個人欠課確認
  onClickMenu5 = function () {
    setColor(5);
    // 全体の名簿は通常変わらないから、モデルは取得済なら問い合わせをせず完了する
    skt.model.readyAllClass('kojinkekka');
    return false;
  }
  // 出欠入力(担任)
  onClickMenu6 = function () {
    //console.log('onClickMenu6');
    setColor(6);
    skt.shell.resetDate(); //日付がずれたままだど使いにくいので、メニューを押したら今日に戻す
    skt.model.setTargetClass('input');
    return false;
  }
  // 出欠確認(担任)
  onClickMenu7 = function () {
    //console.log('onClickMenu7');
    setColor(7);
    skt.model.setTargetClass('count');
    return false;
  }

  // 代理で出欠(教務)
  onClickMenu8 = function () {
    //console.log('onClickMenu8');
    setColor(8);
    skt.model.readyAllClass('proxy');
    return false;
  }
  // 日課の入力(教務)
  onClickMenu9 = function () {
    //console.log('onClickMenu9');
    setColor(9);
    skt.shell.resetDate(); //日付がずれたままだど使いにくいので、メニューを押したら今日に戻す
    $.gevent.publish('inputNikka', [{}]);
    return false;
  }
  // 休学の入力(教務)
  onClickMenu10 = function () {
    //console.log('onClickMenu10');
    setColor(10);
    skt.shell.resetDate(); //日付がずれたままだど使いにくいので、メニューを押したら今日に戻す
    skt.model.readyAllClass('kyuugaku');
    return false;
  }
  // 合同名簿登録(教務)
  onClickMenu11 = function () {
    //console.log('onClickMenu10');
    setColor(11);
    skt.shell.resetDate(); //日付がずれたままだど使いにくいので、メニューを押したら今日に戻す
    skt.model.readyAllGoudouMeibo('menu'); //clientStateは現状未使用
    return false;
  }

  //---ユーティリティメソッド---
  setColor = function (menuNum) {
    let i, menus = [jqueryMap.$menu1, jqueryMap.$menu2, jqueryMap.$menu3];

    if (configMap.userKind == 9 || configMap.userKind == 10 || configMap.userKind == 11) {
      menus.push(jqueryMap.$menu4);
      menus.push(jqueryMap.$menu5);
    }
    if (configMap.userKind == 10 || configMap.userKind == 11) {
      menus.push(jqueryMap.$menu6);
      menus.push(jqueryMap.$menu7);
    }
    if (configMap.userKind == 11) {
      menus.push(jqueryMap.$menu8);
      menus.push(jqueryMap.$menu9);
      menus.push(jqueryMap.$menu10);
      menus.push(jqueryMap.$menu11);
    }

    for (i = 0; i < menus.length; i++) {
      if ( (menuNum - 1) == i ) {
        menus[i].css('background-color', '#BEEBD9');
      } else {
        menus[i].css('background-color', '#f0f8ff');
      }
    }
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

    if ( configMap.userKind == 8 ) {
      $container.html( configMap.main_html1 );
    } else if ( configMap.userKind == 9 ) {
      $container.html( configMap.main_html1 + configMap.main_html2 );
    } else if ( configMap.userKind == 10 ) {
      $container.html( configMap.main_html1 + configMap.main_html2 + configMap.main_html3);
    } else if ( configMap.userKind == 11 ) {
      $container.html( configMap.main_html1 + configMap.main_html2 + configMap.main_html3 + configMap.main_html4);
    }

    stateMap.$container = $container;
    setJqueryMap();

    jqueryMap.$menu1
      .click( onClickMenu1 );

    jqueryMap.$menu2
      .click( onClickMenu2 );

    jqueryMap.$menu3
      .click( onClickMenu3 );

    if ( configMap.userKind == 9 || configMap.userKind == 10 || configMap.userKind == 11) {
      jqueryMap.$menu4
        .click( onClickMenu4 );
      jqueryMap.$menu5
        .click( onClickMenu5 );
    }

    if ( configMap.userKind == 10 || configMap.userKind == 11) {
      jqueryMap.$menu6
        .click( onClickMenu6 );

      jqueryMap.$menu7
        .click( onClickMenu7 );
    }

    if ( configMap.userKind == 11) {
      jqueryMap.$menu8
        .click( onClickMenu8 );

      jqueryMap.$menu9
        .click( onClickMenu9 );

      jqueryMap.$menu10
        .click( onClickMenu10 );

      jqueryMap.$menu11
        .click( onClickMenu11 );
    }

    return true;
  }

  removeMenu = function ( ) {
    //初期化と状態の解除
    if ( jqueryMap != null ) {
      if ( jqueryMap.$container ) {
        jqueryMap.$menu1.remove();
        jqueryMap.$menu2.remove();
        jqueryMap.$menu3.remove();
        if ( jqueryMap.$menu4 ) {
          jqueryMap.$menu4.remove();
        }
        if ( jqueryMap.$menu5 ) {
          jqueryMap.$menu5.remove();
        }
        if ( jqueryMap.$menu6 ) {
          jqueryMap.$menu6.remove();
        }
        if ( jqueryMap.$menu7 ) {
          jqueryMap.$menu7.remove();
        }
        if ( jqueryMap.$menu8 ) {
          jqueryMap.$menu8.remove();
        }
        if ( jqueryMap.$menu9 ) {
          jqueryMap.$menu9.remove();
        }
        if ( jqueryMap.$menu10 ) {
          jqueryMap.$menu10.remove();
        }
        if ( jqueryMap.$menu11 ) {
          jqueryMap.$menu11.remove();
        }
      }
    }
    return true;
  }

  return {
    configModule : configModule,
    initModule   : initModule,
    removeMenu   : removeMenu
  };
}());
