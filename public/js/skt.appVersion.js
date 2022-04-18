/*
 * skt.appVersion.js
 * バージョンモジュール
 */

skt.appVersion = (function () {
  'use strict';

  var initModule,show,
      ver = '1.5';

  initModule      = function () {};

  show = function () {
    return 'ver.' + ver;
  };

  return { initModule : initModule,
           show       : show };
}());
