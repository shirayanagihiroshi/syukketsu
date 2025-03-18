/*
 * skt.touroku.js
 * 出欠入力部モジュール
 */
skt.touroku = (function () {
  'use strict';

  //---モジュールスコープ変数---
  var configMap = {
        main_html : String()
          + '<button class="skt-touroku-previousDay">previousDay</button>'
          + '<div class="skt-touroku-today">today</div>'
          + '<button class="skt-touroku-back">今日へ戻る</button>'
          + '<button class="skt-touroku-nextDay">nextDay</button>'
          + '<button class="skt-touroku-calendar">暦</button>'
          + '<div class="skt-touroku-notice"></div>'
          + '<table class="skt-touroku-main"></table>'
          + '<button class="skt-touroku-update">登録</button>'
          + '<div class="skt-touroku-leak"></div>'
          + '<label for="skt-touroku-mode" class="skt-touroku-mode-toggle">'
            + '<input type="checkbox" id="skt-touroku-mode" >'
            + '<div class="skt-toggle-base"></div>'
            + '<div class="skt-toggle-circle"></div>'
            + '<div class="skt-touroku-mode-title"></div>'
          + '</label>',
        tbMain2 : String()
          + '<td class="skt-touroku-main2">',
        tbSyukketsu : String()
          + '<td class="skt-touroku-edi skt-touroku-sk">',
        tbSyukketsu2 : String()
          + '<td class="skt-touroku-edi skt-touroku-sk2">',
        tbKouketsu : String()
          + '<td class="skt-touroku-edi skt-touroku-kk">',
        tbKouketsu2 : String()
          + '<td class="skt-touroku-edi skt-touroku-kk2">',
        tbReason    : String()
          + '<td class="skt-touroku-edi skt-touroku-re">',
        tbReason2    : String()
          + '<td class="skt-touroku-edi skt-touroku-re2">',
        tbMemo      : String()
          + '<td class="skt-touroku-edimemo">',
        tbToInputMemoClsName : String()
          + '<td class="skt-touroku-memoInput">',
        tbToInputMemoClsName2 : String()
          + '<td class="skt-touroku-memoInput skt-touroku-main2">',
        tbToDelMemoClsName : String()
          + '<li class="skt-touroku-memoDelete">',
        tbMemoClsName : String()
          + '<td class="skt-touroku-memo">',
        tbTorikomi : String()
          + '<button class="skt-touroku-torikomi">取込</button>',
        settable_map : { targetYear : true,
                         targetMonth : true,
                         targetDay   : true,
                         mode        : true},
        targetYear  : 0,
        targetMonth : 0,
        targetDay   : 0,
        mode           : "",     // 'normal' or 'studentmemo'
        toggleColorOn  : 'blue', // cssを変えることで色を変えているので値を持っておかないとだめ
        toggleColorOff : 'gray',
        toggleMoveTime : 200     // トグルスイッチの移動に要する時間。ミリ秒
      },
      stateMap = {
        $container : null,
        cl    : null,  // カレンダー情報 ログイン時に取ってあるはず
        tc    : null,  // 更新対象のクラス情報
        sk    : null,  // 更新対象の出欠
        rn    : null,  // 事務からの連絡
        target: [],    // チェック済の登録対象
        edittingFlg : false // テキストボックスを設置して授業名を変更中に
                            // テキストボックス内をクリックした時に、テキストボックを
                            // 再設置すると不自然な挙動になるので、
                            // フォーカスが外れるまでは再設置しない。
      },
      jqueryMap = {},
      setJqueryMap, configModule, initModule, removeTouroku,
      verify, onUpdate, onPrevious, onBack, onNext, createTable,
      setDayButtons, setNotice, setLeak, redrawTable, onToggle,
      printStudentMemo, onCalendar, getMode, setCheckCount;

  //---DOMメソッド---
  setJqueryMap = function () {
    var $container = stateMap.$container;
    jqueryMap = {
      $container   : $container,
      $previousDay : $container.find( '.skt-touroku-previousDay' ),
      $today       : $container.find( '.skt-touroku-today' ),
      $back        : $container.find( '.skt-touroku-back' ),
      $nextDay     : $container.find( '.skt-touroku-nextDay' ),
      $calendar    : $container.find( '.skt-touroku-calendar' ),
      $notice      : $container.find( '.skt-touroku-notice' ),
      $main        : $container.find( '.skt-touroku-main' ),
      $update      : $container.find( '.skt-touroku-update' ),
      $leak        : $container.find( '.skt-touroku-leak' ),
      $toggleLabel  : $container.find( '.skt-touroku-mode-toggle' ),
      $toggleTitle  : $container.find( '.skt-touroku-mode-title' ),
      $toggleCircle : $container.find( '.skt-toggle-circle' ),
      $toggle       : $container.find( '#skt-touroku-mode' )
    };
  }

  //---イベントハンドラ---
  verify = function () {
    // 入力値を全て取得
    let i, num = stateMap.tc.students.length,
        allData = $('.skt-touroku-main').find('tr'),
        updataArr = [],
        day;

    // 休日に入力をしようとしたときにははじく
    day = skt.util.getDayOfCalendar(configMap.targetYear,
                                    configMap.targetMonth,
                                    configMap.targetDay,
                                    stateMap.cl);
    if (day.result == false) {
      $.gevent.publish('invalidInput', [{errStr:'営業日でないので入力できません'}]);
      return;
    }

    for (i=1; i < (num + 1); i++) { // テーブルのヘッダがあるのでクラスの人数+1
      let retObj = skt.model.skTable2obj(allData[i]);

      if ( retObj.result == 1 ) {
        updataArr.push( retObj.updateObj );

      // チェックに異常があれば
      } else if ( retObj.result == 2 ) {
        $.gevent.publish('invalidInput', [{errStr:retObj.errStr}]);
        return;
      }
    }
    stateMap.target = updataArr;
    $.gevent.publish('verifySkUpdate', [{}]);
  }

  onUpdate = function () {
    skt.model.updateSyukketsu({gakunen  : Number(stateMap.tc.gakunen),
                                cls     : Number(stateMap.tc.cls),
                                year    : Number(configMap.targetYear),
                                month   : Number(configMap.targetMonth),
                                day     : Number(configMap.targetDay),
                                member  : stateMap.target });
  }

  onPrevious = function () {
    let d = skt.util.getPreviousBusinessDay(configMap.targetYear,
                                            configMap.targetMonth,
                                            configMap.targetDay,
                                            stateMap.cl);
    d.mode = configMap.mode;
    $.gevent.publish('inputSkDayChange', [d]);
  }

  onBack = function () {
    let day = new Date(), obj;

    obj = { year  : day.getFullYear(),
            month : day.getMonth() + 1, //月だけ0始まり
            day   : day.getDate(),
            mode  : configMap.mode};
    $.gevent.publish('inputSkDayChange', [obj]);
  }

  onNext = function () {
    let d = skt.util.getNextBusinessDay(configMap.targetYear,
                                        configMap.targetMonth,
                                        configMap.targetDay,
                                        stateMap.cl);
    d.mode = configMap.mode;
    $.gevent.publish('inputSkDayChange', [d]);
  }

  onCalendar = function () {
    $.gevent.publish('calendarPick', []);
  }

  onToggle = function () {
    let mode = jqueryMap.$toggle.prop('checked'),
      obj = { year  : configMap.targetYear,
              month : configMap.targetMonth,
              day   : configMap.targetDay,
              mode  : "" };

    // 授業変更モードなら
    if ( mode == true ) {
      obj.mode = 'studentmemo';

    // 通常モードなら
    } else {
      obj.mode = 'normal';
    }

    // day changeではないが似たような物なので代用
    $.gevent.publish('inputSkDayChange', [obj]);
  }

  //---ユーティリティメソッド---
  createTable = function () {
    let i, str, tablePart,
        num = stateMap.tc.students.length,
        skOneDaySk   = null,
        skOneDayRn   = null;

    if (stateMap.sk != null) {
      // 出欠データはモデルが持ってて、クラスの全体分を取得済のはず。
      // そこから今日の分を探す。
      // findは自体は配列を変えないが、配列がオブジェクトの配列の場合、findしたものを
      // 変更すると、元の配列が変わる
      skOneDaySk = stateMap.sk.find(skt.util.daySelectf(configMap.targetYear,
                                                        configMap.targetMonth,
                                                        configMap.targetDay));
    }

    if (stateMap.rn != null) {
      // 事務からの連絡データもモデルが持ってて、クラスの全体分を取得済のはず。
      // そこから今日の分を探す。
      // こっちはDBの持ち方から、findじゃなくてfilterなので注意
      // filter 自体は新しい配列を作って返すということだが、
      // オブジェクトの配列だった場合は、filterしたものの中身を変えると元の配列が変わる。
      skOneDayRn = stateMap.rn.filter(skt.util.daySelectf(configMap.targetYear,
                                                          configMap.targetMonth,
                                                          configMap.targetDay));
    }

    if (configMap.mode == 'normal') {
      jqueryMap.$main.append(skt.model.getSkTableHeader(true));
    } else if (configMap.mode == 'studentmemo') {
      let str = '<tr>'
            + '<td class="skt-talbe-header">番号</td>'
            + '<td class="skt-talbe-header">氏名</td>'
            + '<td class="skt-talbe-header">生徒の様子メモ</td>';
      jqueryMap.$main.append(str);
    }

    // DBの持つ理由の種別との対応を一致させるためヘッダはモデルに持たせた。
    // テーブルとの変換もモデルでやる。
    for (i =0; i < num; i++) {
      let inKyuugaku = skt.util.inKyuugaku(stateMap.tc.gakunen,
                                           stateMap.tc.cls,
                                           stateMap.tc.students[i].bangou,
                                           configMap.targetYear,
                                           configMap.targetMonth,
                                           configMap.targetDay,
                                           skt.model.getKyuugaku());
      if (configMap.mode == 'normal') {
        let members = [];
        if (skOneDaySk != null) {
          members = skOneDaySk.member;
        }
        //出席番号は1からだから補正する
        // また、休学中の生徒は入力させない
        if (inKyuugaku != "") {
          tablePart = skt.model.readySkTable(members, (i + 1), '<td>', '<td>', '<td>');
        } else {
          if (i % 2 == 0) { //しましま模様にして見やすいように。挙動は変わらない。
            tablePart = skt.model.readySkTable(members, (i + 1), configMap.tbSyukketsu,
                                                                 configMap.tbKouketsu,
                                                                 configMap.tbReason,
                                                                 configMap.tbMemo);
          } else {
            tablePart = skt.model.readySkTable(members, (i + 1), configMap.tbSyukketsu2,
                                                                 configMap.tbKouketsu2,
                                                                 configMap.tbReason2,
                                                                 configMap.tbMemo);
          }
        }
      }

      str = '<tr>';

      if (i % 2 == 0) { //しましま模様にして見やすいように。挙動は変わらない。
        str += '<td>';
      } else {
        str += configMap.tbMain2;
      }
      str += stateMap.tc.students[i].bangou + '</td>';

      if (i % 2 == 0) {
        str += configMap.tbToInputMemoClsName;
      } else {
        str += configMap.tbToInputMemoClsName2;
      }
      str += stateMap.tc.students[i].name + '</td>';

      if (configMap.mode == 'normal') {
        str += tablePart;
        str += '<td>' + skt.model.rnObj2Htm((i + 1), skOneDayRn, configMap.tbTorikomi) + '</td>';
      } else if (configMap.mode == 'studentmemo') {
        // 休学中の生徒は事由を表示
        if (inKyuugaku != "") {
          str += '<td>' + inKyuugaku + '</td>';
        } else {
          str += configMap.tbMemoClsName;
          str += printStudentMemo(configMap.targetYear,
                                  configMap.targetMonth,
                                  configMap.targetDay,
                                  stateMap.tc.gakunen,
                                  stateMap.tc.cls,
                                  stateMap.tc.students[i].bangou);
          str += '</td>';
        }
      }
      str += '</tr>';
      jqueryMap.$main.append(str);
    }
  }

  // stateMapに保持してある日付を元に、前日、本日、翌日のボタンの表示を設定
  setDayButtons = function () {
    let previousDay = skt.util.getPreviousBusinessDay(configMap.targetYear,
                                                      configMap.targetMonth,
                                                      configMap.targetDay,
                                                      stateMap.cl),
        nextDay = skt.util.getNextBusinessDay(configMap.targetYear,
                                              configMap.targetMonth,
                                              configMap.targetDay,
                                              stateMap.cl);
    // 本日
    jqueryMap.$today.html(skt.util.makeDateStr(configMap.targetYear,
                                               configMap.targetMonth - 1, // 月だけ0始まり
                                               configMap.targetDay) + 'の出欠入力');
    // 前日
    jqueryMap.$previousDay.html(skt.util.makeDateStr(previousDay.year,
                                                     previousDay.month - 1, // 月だけ0始まり
                                                     previousDay.day) + 'へ');
    // 翌日
    jqueryMap.$nextDay.html(skt.util.makeDateStr(nextDay.year,
                                                 nextDay.month - 1, // 月だけ0始まり
                                                 nextDay.day) + 'へ');
  }

  setNotice = function () {
    let skToday,day,
        str = "";

    str += skt.model.showGakunen(stateMap.tc.gakunen);
    str += skt.model.showCls(stateMap.tc.gakunen, stateMap.tc.cls);
    str += '。今日は'

    day = skt.util.getDayOfCalendar(configMap.targetYear,
                                    configMap.targetMonth,
                                    configMap.targetDay,
                                    stateMap.cl);
    if (day.result == true) { // result:true は該当日が営業日
      str += day.nikka + '日課。';
      if (day.gyouji != "") {
        str += day.gyouji + '。';
      }
    } else {
      str += '営業日ではありません。';
    }

    jqueryMap.$notice.html(str)
  }

  setLeak = function () {
    let leakflg = false,
        futureflg = false,
        str = "",
        today = new Date();

    stateMap.cl.forEach(function(elem, index) {
      let d = stateMap.sk.find(skt.util.daySelectf(elem.year,
                                                   elem.month,
                                                   elem.day)),
          eachDay = new Date(elem.year, elem.month - 1, elem.day); // 月だけ0始まり

      // ちなみに、eachDayの方は０時設定みたいだから、<=で判定しようとしても
      // 普通はイコールにはならない。
      if (today.getTime() < eachDay.getTime()) {
        // 未来の分はまだ入力してないのが普通なので、未入力の表示はしない。
        // breakしたいけど、forEachはbreakできないみたいなので、ダサいflg処理。
        futureflg = true;
      }

      if (!futureflg) {
        if (d == undefined) {
          str += ' ' + String(elem.month) + '/' + String(elem.day) + ',';
          leakflg = true;
        }
      }
    });

    if (leakflg == true ) {
      str = str.slice(0, -1); //最後の ',' は邪魔なので削除
      str += 'が未入力です'
    }
    jqueryMap.$leak.html(str)
  }

  printStudentMemo = function (y, m, d, g, c, b) {
    let i,
      memoStr = '<ul>',
      sMemo = skt.model.getStudentMemo();

    if (sMemo.length != 0) {
      let idx,
        f = skt.util.dayAndStudentSelectf;

      idx = sMemo.findIndex(f(y, m, d, g, c, b));
      // 該当の日の該当の生徒のデータがあれば
      if (idx != -1) {
        for (i = 0; i < sMemo[idx].contents.length; i++) {
          // 自分で書いたメモなら
          if (skt.model.isMyMemo(sMemo[idx].contents[i]) == true) {
            memoStr += configMap.tbToDelMemoClsName;

          // 他の人が書いたメモなら
          } else {
            memoStr += '<li>';

          }
          memoStr += sMemo[idx].contents[i].memo;
          memoStr += '</li>'
        }
      }
    }
    memoStr += '</ul>'
    return memoStr;
  }

  setCheckCount = function () {
    if (configMap.mode == 'studentmemo') {
      return;
    }
    let syuttei  = document.querySelector(".skt-talbe-syuttei"),
      byouketsu  = document.querySelector(".skt-talbe-byouketsu"),
      jikoketsu  = document.querySelector(".skt-talbe-jikoketsu"),
      tikoku     = document.querySelector(".skt-talbe-tikoku"),
      soutai     = document.querySelector(".skt-talbe-soutai"),
      kouketsu   = document.querySelector(".skt-talbe-kouketsu"),
      zutsuu     = document.querySelector(".skt-talbe-zutsuu"),
      fukutsuu   = document.querySelector(".skt-talbe-fukutsuu"),
      tsuuin     = document.querySelector(".skt-talbe-tsuuin"),
      taityou    = document.querySelector(".skt-talbe-taityou"),
      hatsunetsu = document.querySelector(".skt-talbe-hatsunetsu"),
      kansen     = document.querySelector(".skt-talbe-kansen"),
      jyuken     = document.querySelector(".skt-talbe-jyuken"),
      futyuui    = document.querySelector(".skt-talbe-futyuui"),
      sonota     = document.querySelector(".skt-talbe-sonota"),
      datas      = skt.model.skTableCound(stateMap.tc.students.length, $('.skt-touroku-main').find('tr')),
      f = function (d) {
        if (d == 0) {
          return '';
        } else {
          return String(d);
        }
      };

    syuttei.textContent   = f(datas[0]);
    byouketsu.textContent = f(datas[1]);
    jikoketsu.textContent = f(datas[2]);
    tikoku.textContent    = f(datas[3]);
    soutai.textContent    = f(datas[4]);
    kouketsu.textContent  = f(datas[5]);
    zutsuu.textContent    = f(datas[6]);
    fukutsuu.textContent  = f(datas[7]);
    tsuuin.textContent    = f(datas[8]);
    taityou.textContent   = f(datas[9]);
    hatsunetsu.textContent= f(datas[10]);
    kansen.textContent    = f(datas[11]);
    jyuken.textContent    = f(datas[12]);
    futyuui.textContent   = f(datas[13]);
    sonota.textContent    = f(datas[14]);
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
    let tLetf, tWidth, onPos;

    $container.html( configMap.main_html );
    stateMap.$container = $container;
    setJqueryMap();

    stateMap.cl = skt.model.getCalendar();
    stateMap.cl.sort(skt.util.sortCalendarf); // カレンダーは日付順に並べておく
    stateMap.tc = skt.model.getClassMeibo();
    stateMap.sk = skt.model.getSyukketsu();
    stateMap.rn = skt.model.getRenraku();

    setDayButtons();
    createTable();
    setCheckCount();
    setNotice();
    setLeak();

    // 重複して登録すると、何度もイベントが発行される。それを避けるため、一旦削除
    $(document).off('click');
    $(document).off('blur');

    // トグルボタン、登録ボタンの設定
    tLetf = skt.util.getStyleSheetValue('.skt-toggle-circle', 'left');
    tWidth = skt.util.getStyleSheetValue('.skt-toggle-circle', 'width');
    // pxを除いて足して、またpxをつける
    onPos  = String (Number(tLetf.slice(0, -2)) + Number(tWidth.slice(0, -2))) + 'px';
    if ( configMap.mode == 'normal' ) {
      jqueryMap.$leak.show();
      jqueryMap.$toggle.prop('checked', false); // チェックボックスの設定
      jqueryMap.$toggleTitle.html('通常モード');
      jqueryMap.$toggleCircle.css({'left': tLetf});
      jqueryMap.$toggleCircle.css({'backgroundColor': configMap.toggleColorOff});

      jqueryMap.$update.show();
    } else if ( configMap.mode == 'studentmemo' ) {
      jqueryMap.$leak.hide();
      jqueryMap.$toggle.prop('checked', true);  // チェックボックスの設定
      jqueryMap.$toggleTitle.html('生徒の様子メモ表示');
      jqueryMap.$toggleCircle.css({'left': onPos});
      jqueryMap.$toggleCircle.css({'backgroundColor': configMap.toggleColorOn});

      jqueryMap.$update.hide();
    }


    // 出欠または理由が選択されたらON/OFFする。
    $(document).on('click', '.skt-touroku-edi', function (event) {
      let beforeVal = $(this).html();

      if (beforeVal == '1') {
        $(this).html("");
      } else {
        $(this).html('1');
      }
      setCheckCount();
    });

    // memoがクリックされたらテキストボックスを用意する
    $(document).on('click', '.skt-touroku-edimemo', function (event) {
      var temp = $(this).text();

      if (stateMap.edittingFlg == false) {
        stateMap.edittingFlg = true;

        $(this).html('<input class="hoge" type="text" value="' + temp + '">');

        $('.hoge').focus();
      }
    });

    //テキストボックスからフォーカスが外れたら入力されていた値をセルに設定する
    $(document).on('blur', '.hoge', function () {

      if (stateMap.edittingFlg == true) {
        $('.hoge').parent().html($('.hoge').val());

        stateMap.edittingFlg = false;
      }
    });

    // 取り込みボタンが押されたら
    $(document).on('click', '.skt-touroku-torikomi', function () {
      let p, newTd,
          // [0]をつけるとDOMElement自体が返されるが
          // これはjQueryのオブジェクトではない。
          // だから、.html()しようとすると is not a functionと言って怒られる
          rnTd     = $(this).parent()[0].innerHTML,
          row      = $(this).parent().parent()[0].rowIndex,
          targetTr = $(this).parent().parent(),
          selectfunc = function ( month, day, gakunen, cls, bangou ) {
            return function ( target ) {
              if ( target.month   == month   &&
                   target.day     == day     &&
                   target.gakunen == gakunen &&
                   target.cls     == cls     &&
                   target.bangou  == bangou ) {
                return true;
              }
            };
          };
          // 取り込みボタンを押してるから、該当する連絡データが必ずあるばず
          p = stateMap.rn.find(selectfunc(configMap.targetMonth,
                                          configMap.targetDay,
                                          Number(stateMap.tc.gakunen),
                                          Number(stateMap.tc.cls),
                                          row));
          // 該当行を更新
          newTd = '<td>' + p.bangou + '</td>';
          newTd += '<td>' + p.name + '</td>';
          newTd += skt.model.skObj2Table(p.kind, p.reason,
                                         (p.memo != null) ? p.memo : "",
                                         configMap.tbSyukketsu,
                                         configMap.tbKouketsu,
                                         configMap.tbReason,
                                         configMap.tbMemo);
          newTd += '<td>' + rnTd + '</td>';
          targetTr.eq(0).html(newTd);

    });

    // 氏名が選択されたら様子メモを入力する。
    $(document).on('click', '.skt-touroku-memoInput', function (event) {
      let str,
        tateIndex = $(this).closest('tr').index();

      // 入力ダイアログでの表示文言
      str = String(configMap.targetMonth) + '/' + String(configMap.targetDay)
        + 'の' + skt.model.showGakunen(stateMap.tc.gakunen)
        + skt.model.showCls(stateMap.tc.gakunen, stateMap.tc.cls)
        + String(stateMap.tc.students[tateIndex-1].bangou) + '番'
        + '　' + stateMap.tc.students[tateIndex-1].name;

      // ヘッダが１行あるから-1
      $.gevent.publish('studentMemo', [{ year      : Number(configMap.targetYear),
                                         month     : Number(configMap.targetMonth),
                                         day       : Number(configMap.targetDay),
                                         gakunen   : Number(stateMap.tc.gakunen),
                                         cls       : Number(stateMap.tc.cls),
                                         bangou    : Number(stateMap.tc.students[tateIndex-1].bangou),
                                         detailStr : str }]);
    });

    jqueryMap.$toggle
      .click( function () {
        let moveWidth, backGroundColor,
          // configMapに持たせようとしたけど、全体の初期化のタイミングでは
          // まだcssが取れないみたいだったのであきらめてここで取得。
          toggleMoveWidth = skt.util.getStyleSheetValue('.skt-toggle-circle', 'width');

        if ( configMap.mode == 'normal' ) {
          moveWidth       = '+=' + toggleMoveWidth;
          backGroundColor = configMap.toggleColorOn;
        } else {
          moveWidth       = '-=' + toggleMoveWidth;
          backGroundColor = configMap.toggleColorOff;
        }

        // アニメーションが終わったら、onToggle()が呼ばれる。
        jqueryMap.$toggleCircle.stop().animate({
          'left': moveWidth,
          'backgroundColor': backGroundColor
        }, configMap.toggleMoveTime, function () {
          onToggle();
        });

      });

    // 様子メモがクリックされたら、削除確認画面を出す
    $(document).on('click', '.skt-touroku-memoDelete', function (event) {
      let tateIndex = $(this).closest('tr').index();   // テーブルの何行目

      // 当初、削除対象の配列における位置を指定しようと思った。しかし
      // 'contents.2.delflg' みたいな感じでアクセスすることはできたが
      // n番目をパラメータとして扱う方法がよく分からなかった。
      // arrayFilters を使うのも配列の位置の指定がよく分からん。
      // 結局メモの内容の一致で指定することにした。
      $.gevent.publish('delStudentMemo', [{ year    : Number(configMap.targetYear),
                                            month   : Number(configMap.targetMonth),
                                            day     : Number(configMap.targetDay),
                                            gakunen : Number(stateMap.tc.gakunen),
                                            cls     : Number(stateMap.tc.cls),
                                            // ヘッダが１行あるから-1
                                            bangou  : Number(stateMap.tc.students[tateIndex-1].bangou),
                                            memo    : $(this).html(),
                                            showStr : $(this).html() }]);
    });

    jqueryMap.$previousDay
      .click( onPrevious );
    jqueryMap.$back
      .click( onBack );
    jqueryMap.$nextDay
      .click( onNext );
    jqueryMap.$calendar
      .click( onCalendar );
    jqueryMap.$update
      .click( verify );

    return true;
  }

  removeTouroku = function ( ) {
    //初期化と状態の解除
    if ( jqueryMap != null ) {
      if ( jqueryMap.$container ) {
        jqueryMap.$previousDay.remove();
        jqueryMap.$today.remove();
        jqueryMap.$back.remove();
        jqueryMap.$nextDay.remove();
        jqueryMap.$calendar.remove();
        jqueryMap.$notice.remove();
        jqueryMap.$main.remove();
        jqueryMap.$update.remove();
        jqueryMap.$leak.remove();
        jqueryMap.$toggleLabel.remove();
      }
    }
    return true;
  }

  // 生徒の様子メモを追加したあとの再描画用
  redrawTable = function () {
    if ( (jqueryMap != null) && (jqueryMap.$main != null) &&
         (jqueryMap.$main.filter(':visible').length != 0) ) { // 表示中なら

      jqueryMap.$main.html("");
      createTable();
    }
  }

  getMode = function () {
    return configMap.mode;
  }

  return {
    configModule  : configModule,
    initModule    : initModule,
    removeTouroku : removeTouroku,
    Update        : onUpdate,
    redrawTable   : redrawTable,
    getMode       : getMode
  };
}());
