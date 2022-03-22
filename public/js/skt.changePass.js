/*
 * skt.changePass.js
 * パスワード変更モジュール
 */
skt.changePass = (function () {
  'use strict';

  //---モジュールスコープ変数---
  var configMap = {
        main_html : String()
          + '<div class="skt-changePass-oldpass">今のパスワード</div>'
          + '<input class="skt-changePass-oldpass-textbox" type="password">'
          + '<div class="skt-changePass-newpass1">新しいパスワード</div>'
          + '<input class="skt-changePass-newpass1-textbox" type="password">'
          + '<div class="skt-changePass-newpass2">新しいパスワード(確認)</div>'
          + '<input class="skt-changePass-newpass2-textbox" type="password">'
          + '<button class="skt-changePass-change">変更</button>',
        settable_map : {}
      },
      stateMap = {
        $container : null,
        oldpass    : "",
        newPass    : ""
      },
      jqueryMap = {},
      setJqueryMap, configModule, initModule, removeChangePass, onChange,
      changeExe;

  //---DOMメソッド---
  setJqueryMap = function () {
    var $container = stateMap.$container;
    jqueryMap = {
      $container : $container,
      $old       : $container.find( '.skt-changePass-oldpass' ),
      $oldtext   : $container.find( '.skt-changePass-oldpass-textbox' ),
      $new1      : $container.find( '.skt-changePass-newpass1' ),
      $new1text  : $container.find( '.skt-changePass-newpass1-textbox' ),
      $new2      : $container.find( '.skt-changePass-newpass2' ),
      $new2text  : $container.find( '.skt-changePass-newpass2-textbox' ),
      $change    : $container.find( '.skt-changePass-change' )
    };
  }

  //---イベントハンドラ---
  onChange = function () {
    let old  = jqueryMap.$oldtext.val(),
        new1 = jqueryMap.$new1text.val(),
        new2 = jqueryMap.$new2text.val();

    if ( old == "" || new1 == "" || new2 == "" || old == new1 || new1 != new2 ) {
      $.gevent.publish('invalidInput', [{errStr:'入力が不正です'}]);

    // 桁数
    } else if ( new1.length <= 7 ) {
      $.gevent.publish('invalidInput', [{errStr:'パスワードは8文字以上必要です'}]);

    // あまりにやる気のないのは弾く
    } else if ( new1 == '12345678' || new1 == '11111111' ||
                new1 == 'aaaaaaaa' || new1 == 'password' ||
                new1 == 'Password' || new1 == 'PASSWORD')  {
      $.gevent.publish('invalidInput', [{errStr:'それはだめです'}]);

    // サーバに問い合わせ
    } else {
      stateMap.oldpass = old;
      stateMap.newPass = new1;

      $.gevent.publish('verifyChgPass', [{}]);
    }
  }

  //---ユーティリティメソッド---

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

    jqueryMap.$change
      .click( onChange );

    return true;
  }

  removeChangePass = function ( ) {
    //初期化と状態の解除
    if ( jqueryMap != null ) {
      if ( jqueryMap.$container ) {

        jqueryMap.$old.remove();
        jqueryMap.$oldtext.remove();
        jqueryMap.$new1.remove();
        jqueryMap.$new1text.remove();
        jqueryMap.$new2.remove();
        jqueryMap.$new2text.remove();
        jqueryMap.$change.remove();
      }
    }
    return true;
  }

  changeExe = function () {
    skt.model.changePass(stateMap.oldpass, stateMap.newPass);
  }

  return {
    configModule     : configModule,
    initModule       : initModule,
    removeChangePass : removeChangePass,
    changeExe        : changeExe
  };
}());
