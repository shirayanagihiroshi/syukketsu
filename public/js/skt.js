/*
 * skt.js
 * ルート名前空間モジュール
 */
var skt = (function () {
  'use strict';

  var initModule = function ( $container ) {
    skt.model.initModule();
    skt.shell.initModule($container);
  }

  return { initModule : initModule };
}());
