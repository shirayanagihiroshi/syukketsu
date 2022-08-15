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
          + '<table border=1 class="skt-kojinkekkakakunin-main"></table>',
        settable_map : {},
        allMeibo : {}
      },
      stateMap = {
        $container             : null,
        dropDownListPosCls     : 1,  // リストを操作し登録対象の生徒を選ぶ時に使う
        target                 : {}, // 確認の対象
        onePersonKekka         : [], // 確認の対象の欠課データ
        userInfo               : {}, // 教員の氏名、授業名などが入ってる
        sk                     : {}  // 出欠（欠課のうち何回が出席停止か調べる用）
      },
      jqueryMap = {},
      setJqueryMap, configModule, initModule, removeKojinkekkakakunin,
      setDropDownList, createTable, userIdFilterf, getShimei, getJyugoumei, onShow,
      holdOnePersonKekka, holdUserInfo, holdSyukketsu;

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

    // ちょっとした表示
    jqueryMap.$notice.html(stateMap.target.name + 'の欠課を表示します');

    // まず該当の生徒の欠課を取得 (次はholdOnePersonKekka)
    skt.model.readyKekkaOnePerson('KekkaOnePerson',
                                  stateMap.target.gakunen,
                                  stateMap.target.cls,
                                  stateMap.target.bangou);
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

  // 欠課の表示
  createTable = function () {
    let str, i, jyugyou, kekkasPerJyugyou,
      hyoujizumiJyugyouList = [],
      f = function (userId, jyugyouId) {
        return function (target) {
          if ( (target.userId == userId) && (target.jyugyouId == jyugyouId) ) {
            return true;
          }
        }
      },
      jyugyouSelectf = function (userId, jyugyouId) {
        return function (target) {
          if ( (target.userId == userId) && (target.jyugyouId == jyugyouId) && (target.state == "done")) {
            return true;
          }
        }
      };

//    stateMap.onePersonKekka
//    stateMap.sk



//    { "day" : 8, "koma" : 4, "month" : 4, "userId" : "hnittai044", "year" : 2022, "contents" : [ ], "jyugyouId" : "2", "memo" : "削除済", "state" : "none" }

    console.log(stateMap.onePersonKekka);

    jqueryMap.$main.html("");
    str =  '<tr><td>教員名</td><td>授業名</td><td>欠課時数</td></tr>';
    jqueryMap.$main.append(str);

    for (i = 0; i < stateMap.onePersonKekka.length; i++) {
      jyugyou = hyoujizumiJyugyouList.find(f(stateMap.onePersonKekka[i].userId, stateMap.onePersonKekka[i].jyugyouId));
      if (jyugyou == null) {
        //表示処理
        kekkasPerJyugyou = stateMap.onePersonKekka.filter(jyugyouSelectf(stateMap.onePersonKekka[i].userId,
                                                                         stateMap.onePersonKekka[i].jyugyouId));

        str =  '<tr>';
        str +=   '<td>'
        str +=     getShimei(stateMap.userInfo, stateMap.onePersonKekka[i].userId);
        str +=   '</td>'
        str +=   '<td>'
        str +=     getJyugoumei(stateMap.userInfo,
                                stateMap.onePersonKekka[i].userId,
                                stateMap.onePersonKekka[i].jyugyouId);
        str +=   '</td>'
        str +=   '<td>'
        str +=     String(kekkasPerJyugyou.length);
        str +=   '</td>'
        jqueryMap.$main.append(str);

        // これは表示済にする。
        hyoujizumiJyugyouList.push({userId    : stateMap.onePersonKekka[i].userId,
                                    jyugyouId : stateMap.onePersonKekka[i].jyugyouId});
      } else {
        // 表示済なので何もしない
      }
    }

  }

  userIdFilterf = function (userId) {
    return function (target) {
      if ( (target.userId == userId) ) {
        return true;
      }
    }
  };

  getShimei = function (usersInfo, userId) {
    let p = usersInfo.filter(userIdFilterf(userId));

    if (p != null) {
      // IDで検索しているから、ヒットするのは1件のみのはず
      return(p[0].name);
    } else {
      return('userId:' + String(userId));
    }
  }

  getJyugoumei = function (usersInfo, userId, jyugyouId) {
    let jyugyou,
      p = usersInfo.filter(userIdFilterf(userId)),
      f = function (target) {
        return function (target) {
          if ( (target.jyugyouId == jyugyouId) ) {
            return true;
          }
        }
      };

    if ( (p != null) && (Object.keys(p[0]).indexOf('jyugyou') != -1) ) {
      // IDで検索しているから、ヒットするのは1件のみのはず
      jyugyou = p[0].jyugyou.filter(f(jyugyouId));
      if ( jyugyou != null) {
        if (Object.keys(jyugyou[0]).indexOf('tanni') != -1) {
          return(jyugyou[0].name + '(' + String(jyugyou[0].tanni) + '単位)');
        } else {
          return(jyugyou[0].name);
        }
      }
    }

    return( 'jyugyouId:' + String(jyugyouId) );
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

  holdOnePersonKekka = function (msg) {
    stateMap.onePersonKekka = msg.res;

    // 次にこの生徒のクラスの出欠情報を取得 (次は holdSyukketsu)
    skt.model.readySyukketsuGakunenCls('kojinkekka',
                                       stateMap.target.gakunen,
                                       stateMap.target.cls);
  }

  holdSyukketsu = function (msg) {
    stateMap.sk = skt.model.getSyukketsu();

    // 次に多分ユーザー情報を取得 (次は holdUserInfo)
    skt.model.readyUserInfo('KekkaOnePerson');
  }

  holdUserInfo = function (msg) {
    stateMap.userInfo = msg.res;

    createTable();
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
        jqueryMap.$notice.remove();
        jqueryMap.$main.remove();
      }
    }
    return true;
  }

  return {
    configModule  : configModule,
    initModule    : initModule,
    holdOnePersonKekka      : holdOnePersonKekka,
    holdUserInfo            : holdUserInfo,
    holdSyukketsu           : holdSyukketsu,
    removeKojinkekkakakunin : removeKojinkekkakakunin
  };
}());
