/*
 * skt.dialog.js
 * ログインダイアログモジュール
 */
skt.dialog = (function () {
  'use strict';

  //---モジュールスコープ変数---
  var configMap = {
        main_html : String()
        + '<div class="skt-dialog">'
          + '<div class="skt-dialog-head">'
            + '<h1>ログインする？</h1>'
            + '<div class="skt-dialog-closer">'
              + '<p>x</p>'
            + '</div>'
          + '</div>'
          + '<div class="skt-dialog-main">'
            + '<div class="skt-dialog-main-username-title">'
              + '<p>ユーザID</p>'
            + '</div>'
            + '<input type="text" class="skt-dialog-main-username-textbox">'
            + '<div class="skt-dialog-main-passward-title">'
              + '<p>password</p>'
            + '</div>'
            + '<input type="password" class="skt-dialog-main-passward-textbox">'
            + '<button class="skt-dialog-main-button-ok">'
              + '<p>ok</p>'
            + '</button>'
            + '<button class="skt-dialog-main-button-cancel">'
              + '<p>cancel</p>'
            + '</button>'
          + '</div>'
        + '<div>',
        settable_map : {}
      },
      stateMap = {
        $append_target : null
      },
      jqueryMap = {},
      setJqueryMap, configModule, initModule, removeDialog, onClose, onOK;

  //---DOMメソッド---
  setJqueryMap = function () {
    var $append_target = stateMap.$append_target,
        $dialog = $append_target.find( '.skt-dialog' );
    jqueryMap = {
      $dialog          : $dialog,
      $closer          : $dialog.find( '.skt-dialog-closer' ),
      $usernameTitle   : $dialog.find( '.skt-dialog-main-username-title' ),
      $usernameTextbox : $dialog.find( '.skt-dialog-main-username-textbox' ),
      $PasswordTitle   : $dialog.find( '.skt-dialog-main-passward-title' ),
      $PasswordTextbox : $dialog.find( '.skt-dialog-main-passward-textbox' ),
      $buttonOK        : $dialog.find( '.skt-dialog-main-button-ok' ),
      $buttonCancel    : $dialog.find( '.skt-dialog-main-button-cancel' )
    };
  }

  //---イベントハンドラ---
  onClose = function () {
    $.gevent.publish('cancelDialog', [{}]);
    return false;
  }

  onOK = function () {
    // console.log(jqueryMap.$usernameTextbox.val());
    // console.log(jqueryMap.$PasswordTextbox.val());

    skt.model.login({userId:jqueryMap.$usernameTextbox.val(),
                     passWord:jqueryMap.$PasswordTextbox.val()});
    return false;
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

  removeDialog = function ( ) {
    //初期化と状態の解除
    if ( jqueryMap != null ) {
      if ( jqueryMap.$dialog ) {
        jqueryMap.$dialog.remove();
        jqueryMap = null;
      }
    }
    stateMap.$append_target = null;
    return true;
  }

  initModule = function ( $append_target ) {
    // $container.html( configMap.main_html );
    // じゃなくて、appendするパターン
    // shellでコンテナを用意すると、dialog側を消してもコンテナが残っちゃう。
    $append_target.append( configMap.main_html );
    stateMap.$append_target = $append_target;
    setJqueryMap();

    jqueryMap.$buttonOK
      .click( onOK );
    jqueryMap.$closer
      .click( onClose );
    jqueryMap.$buttonCancel
      .click( onClose );

    return true;
  }

  return {
    configModule : configModule,
    initModule   : initModule,
    removeDialog : removeDialog
  };
}());
