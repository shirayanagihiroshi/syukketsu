/*
 * skt.appVersion.js
 * バージョンモジュール
 */

skt.appVersion = (function () {
  'use strict';

  var initModule, show, zenkiP, koukiP,
      ver = '1.9';

  initModule      = function () {};

  show = function () {
    return 'ver.' + ver;
  };

  zenkiP = function () {
    return { startY : 2024, // 欠課時数の集計の期間を指定
             startM : 4,
             startD : 1,
             endY   : 2024,
             endM   : 9,
             endD   : 30 }
  }

  koukiP = function () {
    return { startY : 2024,
             startM : 10,
             startD : 1,
             endY   : 2025,
             endM   : 3,
             endD   : 31 }
  }

  return { initModule : initModule,
           show       : show ,
           getZenkiPeriod : zenkiP ,
           getKoukiPeriod : koukiP };
}());
