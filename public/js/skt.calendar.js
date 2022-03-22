/*
 * skt.calendar.js
 * 日課設定モジュール
 */
skt.calendar = (function () {
  'use strict';

  //---モジュールスコープ変数---
  var configMap = {
        main_html : String()
          + '<button class="skt-calendar-previousWeek">前の週</button>'
          + '<button class="skt-calendar-back">今週へ戻る</button>'
          + '<button class="skt-calendar-nextWeek">次の週</button>'
          + '<div class="skt-calendar-notice"></div>'
          + '<table class="skt-calendar-main"></table>'
          + '<button class="skt-calendar-update">登録</button>',
        tbHeader : String()
          + '<tr><td>曜日</td>'
          + '<td class="skt-calendar-dotunderline">日</td>'
          + '<td class="skt-calendar-dotunderline">月</td>'
          + '<td class="skt-calendar-dotunderline">火</td>'
          + '<td class="skt-calendar-dotunderline">水</td>'
          + '<td class="skt-calendar-dotunderline">木</td>'
          + '<td class="skt-calendar-dotunderline">金</td>'
          + '<td class="skt-calendar-dotunderline">土</td></tr>',
        tbNikka : String()
          + '<td class="skt-calendar-edi skt-calendar-dotunderline">',
        tbGyouji : String()
          + '<td class="skt-calendar-edimemo">',
        settable_map : { targetYear : true,
                         targetMonth : true,
                         targetDay   : true},
        targetYear  : 0,
        targetMonth : 0,
        targetDay   : 0
      },
      stateMap = {
        $container : null,
        cl         : null  // カレンダー情報
      },
      jqueryMap = {},
      setJqueryMap, configModule, initModule, removeCalendar,
      onUpdate, onPrevious, onBack, onNext, createTable,

      verify, setNotice;

  //---DOMメソッド---
  setJqueryMap = function () {
    var $container = stateMap.$container;
    jqueryMap = {
      $container   : $container,
      $previousWeek: $container.find( '.skt-calendar-previousWeek' ),
      $back        : $container.find( '.skt-calendar-back' ),
      $nextWeek    : $container.find( '.skt-calendar-nextWeek' ),
      $notice      : $container.find( '.skt-calendar-notice' ),
      $main        : $container.find( '.skt-calendar-main' ),
      $update      : $container.find( '.skt-calendar-update' )
    };
  }

  //---イベントハンドラ---
  verify = function () {
    // チェックすべき内容はないので、ユーザがOKなら良い
    $.gevent.publish('verifyClUpdate', [{errStr:'日課、行事を入力しますか？'}]);
  }

  onUpdate = function () {
    let i, j, weeks,
        allData = $('.skt-calendar-main').find('tr'),// 入力値を全て取得
        updataArr = [],
        nikkaPos = function ( n ) {
          return ((3 * n) + 2);
        },
        gyoujiPos = function ( n ) {
          return ((3 * n) + 3);
        };

    for (j = 0; j < 4; j++) {
      weeks = skt.util.getWeek(configMap.targetYear,
                               configMap.targetMonth-1, //月だけ0始まり
                               configMap.targetDay,
                               j);
      for (i = 0; i < 8; i++) {

        if (i != 0) {
          let obj;
          //-1は最初の一列がデータでないため、ずれるから
          obj = {year   : weeks[i-1].year,
                 month  : weeks[i-1].month,
                 day    : weeks[i-1].day,
                 nikka  : allData[nikkaPos(j)].children[i].textContent,
                 gyouji : allData[gyoujiPos(j)].children[i].textContent};

          updataArr.push(obj);
        }

      }
    }
    skt.model.updateCalendar(updataArr);
  }

  onPrevious = function () {
    let day = new Date(configMap.targetYear, configMap.targetMonth - 1, configMap.targetDay), obj;

    day.setDate(day.getDate() - (1*7));

    obj = { year  : day.getFullYear(),
            month : day.getMonth() + 1, //月だけ0始まり
            day   : day.getDate()};
    $.gevent.publish('inputNikka', [obj]);
  }

  onBack = function () {
    let day = new Date(), obj;

    obj = { year  : day.getFullYear(),
            month : day.getMonth() + 1, //月だけ0始まり
            day   : day.getDate()};
    $.gevent.publish('inputNikka', [obj]);
  }

  onNext = function () {
    let day = new Date(configMap.targetYear, configMap.targetMonth - 1, configMap.targetDay), obj;

    day.setDate(day.getDate() + (1*7));

    obj = { year  : day.getFullYear(),
            month : day.getMonth() + 1, //月だけ0始まり
            day   : day.getDate()};
    $.gevent.publish('inputNikka', [obj]);
  }

  //---ユーティリティメソッド---
  createTable = function () {

    let i, j, str, weeks, calOneDay,
        //年月日を指定して該当の日の分を引き当てる
        selectfunc = function ( year, month, day ) {
          return function ( target ) {
            if (target.year == year && target.month == month && target.day == day) {
              return true;
            }
          };
        },
        gyouji = []; //何度も検索するのがもったいないので、カレンダーを検索した結果を保存しておく。(1週間分)

    jqueryMap.$main.append(configMap.tbHeader);

    for (j = 0; j < 4; j++) {
      weeks = skt.util.getWeek(configMap.targetYear,
                               configMap.targetMonth-1, //月だけ0始まり
                               configMap.targetDay,
                               j);
      // 曜日あたり1行目：日付
      str = '<tr>';
      for (i = 0; i < 8; i++) {
        if (i == 0) {
          str += '<td>日付</td>';
        } else {
          str += '<td>';
          //-1は最初の一つがA/Bでずれるから
          str += String(weeks[i-1].month) + '/' + String(weeks[i-1].day);
          str += '</td>';
        }
      }
      str += '</tr>';
      // 曜日あたり2行目：日課
      str += '<tr>';
      for (i = 0; i < 8; i++) {
        if (i == 0) {
          str += '<td>日課</td>';
        } else {
          str += configMap.tbNikka;
          //-1は最初の一つがA/Bでずれるから
          calOneDay = stateMap.cl.find(selectfunc(weeks[i-1].year, weeks[i-1].month, weeks[i-1].day));
          if ( calOneDay != null ) {
            if ( calOneDay.nikka != null ) {
              str += calOneDay.nikka;
            }

            // 3行目の準備
            if ( calOneDay.gyouji != null ) {
              gyouji[i] = calOneDay.gyouji
            } else {
              gyouji[i] = "";
            }
          } else {
            gyouji[i] = "";
          }
          str += '</td>';
        }
      }
      str += '</tr>';
      // 曜日あたり3行目：行事(今は教務で入力する形だが、連絡を全教員が入力するように
      // これは別に移したほうがよい。そしたら、ABより詳細は授業の日課とかいれるか)
      str += '<tr>';
      for (i =0; i < 8; i++) {
        if (i == 0) {
          str += '<td>行事</td>';
        } else {
          str += configMap.tbGyouji;
          str += gyouji[i];
          str += '</td>';
        }
      }
      str += '</tr>';
      jqueryMap.$main.append(str);
    }
  }

  setNotice = function () {
    // 前期、後期、それぞれで営業日を数える。
    let zenki, kouki, i, str;

    zenki = 0;
    kouki = 0;
    if (stateMap.cl != null) {
      for (i = 0; i < stateMap.cl.length; i++) {
        if (4 <= stateMap.cl[i].month && stateMap.cl[i].month <= 9) {
          zenki++;
        } else {
          kouki++;
        }
      }
    }

    str = '前期:' + String(zenki) + '日';
    str += '、後期:' + String(kouki) + '日';
    str += '、合計:' + String(zenki + kouki) + '日';

    jqueryMap.$notice.html(str)
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

    stateMap.cl = skt.model.getCalendar();
    stateMap.cl.sort(skt.util.sortCalendarf); // カレンダーは日付順に並べておく

    createTable();
    setNotice();

    // 重複して登録すると、何度もイベントが発行される。それを避けるため、一旦削除
    $(document).off('click');
    $(document).off('blur');

    // 出欠または理由が選択されたらON/OFFする。
    $(document).on('click', '.skt-calendar-edi', function (event) {
      let beforeVal = $(this).html();

      if (beforeVal == 'A') {
        $(this).html('B');
      } else if (beforeVal == 'B') {
        $(this).html("");
      } else {
        $(this).html('A');
      }
    });

    // memoがクリックされたらテキストボックスを用意する
    $(document).on('click', '.skt-calendar-edimemo', function (event) {
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

    jqueryMap.$previousWeek
      .click( onPrevious );
    jqueryMap.$back
      .click( onBack );
    jqueryMap.$nextWeek
      .click( onNext );
    jqueryMap.$update
      .click( verify );

    return true;
  }

  removeCalendar = function ( ) {
    //初期化と状態の解除
    if ( jqueryMap != null ) {
      if ( jqueryMap.$container ) {
        jqueryMap.$previousWeek.remove();
        jqueryMap.$back.remove();
        jqueryMap.$notice.remove();
        jqueryMap.$nextWeek.remove();
        jqueryMap.$main.remove();
        jqueryMap.$update.remove();
      }
    }
    return true;
  }

  return {
    configModule  : configModule,
    initModule    : initModule,
    removeCalendar: removeCalendar,
    Update        : onUpdate
  };
}());
