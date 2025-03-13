/*
 * skt.kekka.jyugyou
 * 欠課入力部(授業追加)モジュール
 */
skt.kekkaJyugyou = (function () {
  'use strict';

  //---モジュールスコープ変数---
  var configMap = {
        main_html : String()
          + '<div class="skt-kekka-jyugyou-headline">授業の設定</div>'
          + '<div class="skt-kekka-jyugyou-nametitle">授業名(後で変更可能)</div>'
          + '<input type="text" class="skt-kekka-jyugyou-nametext" maxlength="20">'
          + '<div class="skt-kekka-jyugyou-meiboType">'
            // nameを同じにすることで、グループ化して、グループ内で
            // 一つしか選択できないようにできる。らしい。
            + '<input type="radio" name="meiboType" value="gkaunenCls" checked="checked">学年とクラスで指定 '
            + '<input type="radio" name="meiboType" value="meiboId">混合名簿IDで指定'
          + '</div>'
          + '<select class="skt-kekka-jyugyou-gakunenlist">'
          + '</select>'
          + '<select class="skt-kekka-jyugyou-clslist">'
          + '</select>'
          + '<select class="skt-kekka-jyugyou-meiboIdlist">'
          + '</select>'
          + '<div class="skt-kekka-jyugyou-tanniList-title">単位数(後で変更可能)</div>'
          + '<select class="skt-kekka-jyugyou-tanniList">'
            + '<option value="0">設定しない</option>'
            + '<option value="1">1</option>'
            + '<option value="2">2</option>'
            + '<option value="3">3</option>'
            + '<option value="4">4</option>'
            + '<option value="5">5</option>'
            + '<option value="6">6</option>'
            + '<option value="7">7</option>'
          + '</select>'
          + '<button class="skt-kekka-jyugyou-add">↓追加↓</button>'
          + '<button class="skt-kekka-jyugyou-update">授業の登録</button>'
          + '<button class="skt-kekka-jyugyou-cancel">戻る</button>'
          + '<table class="skt-kekka-jyugyou-main"></table>',
        tbHeader : String()
          + '<tr>'
            + '<td>ID（自動採番）</td>'
            + '<td>授業名</td>'
            + '<td>学年</td>'
            + '<td>組</td>'
            + '<td>混合授業名簿ID</td>'
            + '<td>単位数</td>'
            + '<td> </td>'
          + '</tr>',
        // 事務からの連絡のときは真面目に名簿から取ってるけど、ここでは固定で持っとく
        highschoolClsList : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        juniorhighClsList : [1, 2, 3],
        gakunenListVal : [1        , 2        , 3        , 4        , 5        , 6        ],
        gakunenListStr : ['中学1年', '中学2年', '中学3年', '高校1年', '高校2年', '高校3年'],
        tbEditClsName : String()
          + '<td class="skt-kekka-jyugyou-edi">',
        tbDeleteClsName : String()
          + '<td class="skt-kekka-jyugyou-del">',
        tbEditTanniClsName : String()
          + '<td class="skt-kekka-jyugyou-edi-tanni">',
        tbEditGakunenClsName : String()
          + '<td class="skt-kekka-jyugyou-edi-gakunen">',
        tbEditClassClsName : String()
          + '<td class="skt-kekka-jyugyou-edi-class">',
        tbEditGoudouMeiboClsName : String()
          + '<td class="skt-kekka-jyugyou-edi-goudouMeibo">'
      },
      stateMap = {
        $container  : null,
        jyugyouEdit : [],  // ユーザ操作で変更した授業。
                           // DBから取ったままのものはmodelが持っていて
                           // getJyugyou で取れるが、そちらは直接は変更しない。
                           // コピーして保持するこっちを編集する。
        editPos     : 0,   // blurのイベントを受けたときはclickのときのように
                           // テーブルにおける位置を取れないみたいなので
                           // ここに保持しておく。
        edittingFlg : false // テキストボックスを設置して授業名を変更中に
                            // テキストボックス内をクリックした時に、テキストボックを
                            // 再設置すると不自然な挙動になるので、
                            // フォーカスが外れるまでは再設置しない。
      },
      jqueryMap = {},
      setJqueryMap, configModule, initModule, removeKekkaJyugyou,
      update, onUpdate, onCancel, onAdd, createTable, setClsList,
      setGakunenList, onGakunenIDChange, onClassIDChange, setGakunenListById,
      setClassListById, 
      setMeiboIdList, copyJyugyou, editedJyugyou, switchList;

  //---DOMメソッド---
  setJqueryMap = function () {
    var $container = stateMap.$container;
    jqueryMap = {
      $container   : $container,
      $headline    : $container.find( '.skt-kekka-jyugyou-headline' ),
      $nameTitle   : $container.find( '.skt-kekka-jyugyou-nametitle' ),
      $nametext    : $container.find( '.skt-kekka-jyugyou-nametext' ),
      $meiboType   : $container.find( '.skt-kekka-jyugyou-meiboType' ),
      $gakunenlist : $container.find( '.skt-kekka-jyugyou-gakunenlist' ),
      $clslist     : $container.find( '.skt-kekka-jyugyou-clslist' ),
      $meiboIdlist : $container.find( '.skt-kekka-jyugyou-meiboIdlist' ),
      $tanniListTitle : $container.find( '.skt-kekka-jyugyou-tanniList-title' ),
      $tanniList   : $container.find( '.skt-kekka-jyugyou-tanniList' ),
      $add         : $container.find( '.skt-kekka-jyugyou-add' ),
      $update      : $container.find( '.skt-kekka-jyugyou-update' ),
      $cancel      : $container.find( '.skt-kekka-jyugyou-cancel' ),
      $main        : $container.find( '.skt-kekka-jyugyou-main' )
    };
  }

  //---イベントハンドラ---
  onUpdate = function () {
    let i;

    if (editedJyugyou()) {
      for (i=0; i < stateMap.jyugyouEdit.length; i++) {
        // 授業名は変更でnull stringになってるかもしれない。
        // 適当に設定して登録しておく。
        if (stateMap.jyugyouEdit[i].name == "") {
          stateMap.jyugyouEdit[i].name = '名前未登録';
        }

        // 単位数が数値でない場合はしれっと消しておく。
        if (Object.keys(stateMap.jyugyouEdit[i]).indexOf('tanni') != -1) {
          if (isNaN(stateMap.jyugyouEdit[i].tanni)) {
            delete stateMap.jyugyouEdit[i].tanni;
          }
        }
      }
      // 登録処理へ
      $.gevent.publish('verifyJGYUpdate', [{errStr:'授業を登録しますか？'}]);
    } else {
      // 編集されていなければ何もしない。
    }
  }

  onCancel = function () {
    $.gevent.publish('setJikanwari', []);
  }

  onAdd = function () {
    let i, newId, meiboType, tanni, addObj,
      textboxVal = jqueryMap.$nametext.val();

    // 授業名が未入力は許さない
    if (textboxVal == "") {
      $.gevent.publish('invalidInput', [{errStr:'授業名は必ず入力してください'}]);

    // (この時点で)授業名が入力されている場合。ただし、授業名はこの後変更されて
    // null stringになるかもしれないので注意。
    } else {
      // IDを採番する。
      // 1から始めて最初に使われていない値を取る。256は大体。
      for (i = 1; i < 256; i++) {
        if (stateMap.jyugyouEdit.findIndex(skt.util.jyugyouSelectf(i)) == -1) {
          newId = i;
          break;
        }
      }

      meiboType = $('input:radio[name="meiboType"]:checked').val();

      if (meiboType == 'gkaunenCls') {
        addObj = {'jyugyouId'     : newId,
                  'gakunen'       : Number(jqueryMap.$gakunenlist.val()),
                  'cls'           : Number(jqueryMap.$clslist.val()),
                  'name'          : textboxVal};
      } else {
        addObj = {'jyugyouId'     : newId,
                  'goudouMeiboId' : Number(jqueryMap.$meiboIdlist.val()),
                  'name'          : textboxVal};
      }

      tanni = Number(jqueryMap.$tanniList.val());
      if (tanni != 0) {
        addObj.tanni = tanni;
      }
      stateMap.jyugyouEdit.push(addObj)

      jqueryMap.$main.html("");
      createTable();
    }
  }

  onGakunenIDChange =  function () {
    let i;

    if (stateMap.edittingFlg == true) {
      if (this.value != 0) {
        stateMap.jyugyouEdit[stateMap.editPos-1].gakunen = Number(this.value);
      } else {
        delete stateMap.jyugyouEdit[stateMap.editPos-1].gakunen;
      }

      $('#sktJyugyouGakunenID').parent().html(configMap.gakunenListStr[this.value - 1]);

      stateMap.edittingFlg = false;
    }
  }

  onClassIDChange =  function () {
    let i, str;

    if (stateMap.edittingFlg == true) {
      if (this.value != 0) {
        stateMap.jyugyouEdit[stateMap.editPos-1].cls = Number(this.value);

        // クラスの設定の前に学年は設定されているはず
        // 学年とクラスを設定するなら、合同名簿ＩＤは削除する
        delete stateMap.jyugyouEdit[stateMap.editPos-1].goudouMeiboId;
        $(this).parent().next().html("");

      } else {
        delete stateMap.jyugyouEdit[stateMap.editPos-1].cls;
      }

      str = skt.model.showCls(stateMap.jyugyouEdit[stateMap.editPos-1].gakunen, this.value);
      $('#sktJyugyouClassID').parent().html(str);

      stateMap.edittingFlg = false;
    }
  }

  //---ユーティリティメソッド---
  createTable = function () {
    let i, str, jyugyou,
      jyugyous  = stateMap.jyugyouEdit;

    str = configMap.tbHeader;

    for (i = 0; i < jyugyous.length; i++) { // 担当する授業の数分繰り返す
      str += '<tr>';
      str += '<td>' + jyugyous[i].jyugyouId + '</td>';

      str += configMap.tbEditClsName + jyugyous[i].name + '</td>';

      str += configMap.tbEditGakunenClsName;
      if (Object.keys(jyugyous[i]).indexOf('gakunen') != -1) {
        str += skt.model.showGakunen(jyugyous[i].gakunen);
      }
      str += '</td>';

      str += configMap.tbEditClassClsName;
      if (Object.keys(jyugyous[i]).indexOf('cls') != -1) {
        str += skt.model.showCls(jyugyous[i].gakunen,jyugyous[i].cls);
      }
      str += '</td>';

      str += configMap.tbEditGoudouMeiboClsName;
      if (Object.keys(jyugyous[i]).indexOf('goudouMeiboId') != -1) {
        str += jyugyous[i].goudouMeiboId;
      }
      str += '</td>';

      str += configMap.tbEditTanniClsName;
      if (Object.keys(jyugyous[i]).indexOf('tanni') != -1) {
        str += String(jyugyous[i].tanni);
      }
      str += '</td>';

      str += configMap.tbDeleteClsName + '<button >この授業を削除</button>' + '</tr>';
    }
    jqueryMap.$main.append(str);
  }
  
  // 学年のドロップダウンを設定
  setGakunenList =  function () {
    let i;

    for (i = 0; i < configMap.gakunenListVal.length ; i++) {
      jqueryMap.$gakunenlist.append($('<option>').val(configMap.gakunenListVal[i]).html(
        configMap.gakunenListStr[i]));
    }
  }

  setGakunenListById = function (IDstr) {
    let i, obj,
      lst = document.getElementById(IDstr);

    // 表中に一時的に現れる学年の選択
    // リストの選択アイテムをonchangeで取る場合、選択項目が変更される必要がある。
    // (変更されないとイベントが飛んでこない)
    // 苦肉の策として、先頭に不要な項目を入れる。
    // 常時存在する方の学年選択リストは上のsetGakunenListで設定していて、
    // そちらでは発生しない問題である。
    obj = document.createElement('option');
    obj.value = 0;
    obj.text  = '選択してね';
    lst.appendChild(obj);

    for (i = 0; i < configMap.gakunenListVal.length ; i++) {
      obj = document.createElement('option');
      obj.value = configMap.gakunenListVal[i];
      obj.text  = configMap.gakunenListStr[i];
      lst.appendChild(obj);
    }
  }

  // 組のドロップダウンを設定。
  setClsList = function () {
    let i, cl, gakunen;

    // 学年ドロップダウンから選択中の値を取得
    gakunen = jqueryMap.$gakunenlist.val();

    // 一旦リストを削除消して
    jqueryMap.$clslist.children().remove();
    // 設定しなおす
    if (gakunen <= 3) {
      cl = configMap.juniorhighClsList;
    } else {
      cl = configMap.highschoolClsList;
    }
    for (i = 0; i < cl.length ; i++) {
      jqueryMap.$clslist.append($('<option>').val(cl[i]).html(
        skt.model.showCls(gakunen, cl[i])));
    }
  }

  setClassListById = function (IDstr, gakunen) {
    let i, obj, cl,
      lst = document.getElementById(IDstr);

    // 表中に一時的に現れるクラスの選択
    // リストの選択アイテムをonchangeで取る場合、選択項目が変更される必要がある。
    // (変更されないとイベントが飛んでこない)
    // 苦肉の策として、先頭に不要な項目を入れる。
    // 常時存在する方の学年選択リストは上のsetGakunenListで設定していて、
    // そちらでは発生しない問題である。
    obj = document.createElement('option');
    obj.value = 0;
    obj.text  = '選択してね';
    lst.appendChild(obj);

    if (gakunen <= 3) {
      cl = configMap.juniorhighClsList;
    } else {
      cl = configMap.highschoolClsList;
    }

    for (i = 0; i < cl.length ; i++) {
      obj = document.createElement('option');
      obj.value = cl[i];
      obj.text  = skt.model.showCls(gakunen, cl[i]);
      lst.appendChild(obj);
    }
  }

  setMeiboIdList = function () {
    let i,
      ml = skt.model.getMeiboIdList(),
      f  = function (a, b) {
        if (a.goudouMeiboId < b.goudouMeiboId) {
          return -1;
        } else if (a.goudouMeiboId == b.goudouMeiboId) {
          return 0;
        } else {
          return 1;
        }
      };

    // 混合名簿IDの順に並べる
    ml.sort(f);

    // 一旦リストを削除消して
    jqueryMap.$meiboIdlist.children().remove();
    // 設定しなおす
    for (i = 0; i < ml.length ; i++) {
      jqueryMap.$meiboIdlist.append($('<option>').val(ml[i].goudouMeiboId).html(String(ml[i].goudouMeiboId)));
    }
  }

  switchList = function () {
    const meiboType = $('input:radio[name="meiboType"]:checked').val();

    if (meiboType == 'gkaunenCls') {
      jqueryMap.$meiboIdlist.hide();

      jqueryMap.$clslist.show();
      jqueryMap.$gakunenlist.show();

    } else if (meiboType == 'meiboId') {
      jqueryMap.$clslist.hide();
      jqueryMap.$gakunenlist.hide();

      jqueryMap.$meiboIdlist.show();
    }
  }

  copyJyugyou = function (arr) {
    let i;

    // 一旦リセット
    stateMap.jyugyouEdit = [];

    // 最近はもっとイカしたコピー方法があるらしい
    for (i = 0; i < arr.length; i++) {
      let obj;

      // 学年とクラスで名簿指定するタイプ
      if (Object.keys(arr[i]).indexOf('gakunen') != -1) {
        obj = {'jyugyouId'     : arr[i].jyugyouId,
               'gakunen'       : arr[i].gakunen,
               'cls'           : arr[i].cls,
               'name'          : arr[i].name};

      // 名簿IDで名簿を指定するタイプ
      } else if (Object.keys(arr[i]).indexOf('goudouMeiboId') != -1) {
        obj = {'jyugyouId'     : arr[i].jyugyouId,
               'goudouMeiboId' : arr[i].goudouMeiboId,
               'name'          : arr[i].name};

      } else {
        obj = {'jyugyouId'     : arr[i].jyugyouId,
               'name'          : arr[i].name};
      }

      if (Object.keys(arr[i]).indexOf('tanni') != -1) {
        obj.tanni = arr[i].tanni;
      }
      stateMap.jyugyouEdit.push(obj);
    }
  }

  // 編集前の授業と編集後の授業が同じかどうかチェック
  // 戻り値 true : 変更あり
  //       false : 変更なし
  editedJyugyou = function () {
    let i, target, before = skt.model.getJyugyou(),
    after = stateMap.jyugyouEdit;

    // 編集前も編集後もなければ、一応変更なしとする
    if (before == null && after == null)  {
      return false;

    // 他方のみがnullなら変更あり
    } else if ( ( before == null && after != null ) ||
                ( before != null && after == null ) ) {
      return true;


    // 追加or削除があれば変更あり
    } else if (before.length != after.length) {
      return true;

    // 前も後もあって、個数が同じなら、順番に比べて一致してるか見る
    } else {

      for (i = 0; i < before.length; i++) {
        if (before[i].jyugyouId != after[i].jyugyouId) {
          return true;
        }
        // 名前が違えば変更あり
        if (before[i].name != after[i].name) {
          return true;
        }
        // もし、前が学年、クラスで指定してれば
        // 後も学年、クラスで指定してて、一致してなきゃ変更有
        if (Object.keys(before[i]).indexOf('gakunen') != -1) {
          if ( !( (Object.keys(after[i]).indexOf('gakunen') != -1) &&
                  (before[i].gakunen == after[i].gakunen)          &&
                  (before[i].cls == after[i].cls) ) ) {
            return true;
          }
        // もし、前が合同IDで指定してれば
        // 後も合同IDで指定してて、一致してなきゃ変更有
        } else {
          if ( !( (Object.keys(after[i]).indexOf('goudouMeiboId') != -1) &&
                  (before[i].goudouMeiboId == after[i].goudouMeiboId) ) ) {
            return true;
          }
        }
        // 他方にのみ単位数が設定されているか、両方単位が設定されていて、値が違うかすれば変更あり。
        if ( ( (Object.keys(before[i]).indexOf('tanni') != -1) &&
               (Object.keys(after[i]).indexOf('tanni')  == -1)    ) ||
             ( (Object.keys(before[i]).indexOf('tanni') == -1) &&
               (Object.keys(after[i]).indexOf('tanni')  != -1)    ) ||
             ( (Object.keys(before[i]).indexOf('tanni') != -1) &&
               (Object.keys(after[i]).indexOf('tanni')  != -1) &&
               (before[i].tanni != after[i].tanni) ) ) {
              return true;
        }
      }

      // チェックに引っかかってなければ、変更なし
      return false;
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
    $container.html( configMap.main_html );
    stateMap.$container = $container;
    setJqueryMap();

    copyJyugyou(skt.model.getJyugyou()); // コピーしたものを使うので、createTableより先にする
    createTable();
    setGakunenList();
    setClsList();
    setMeiboIdList();
    jqueryMap.$meiboIdlist.hide();

    // 重複して登録すると、何度もイベントが発行される。それを避けるため、一旦削除
    $(document).off('click');
    $(document).off('blur');

    $(document).on('click', '.skt-kekka-jyugyou-edi', function (event) {
      let tateIndex = $(this).closest('tr').index(), // ヘッダが1行で、0始まりだから1から
        temp = $(this).text();

      if (stateMap.edittingFlg == false) {
        stateMap.edittingFlg = true;

        // 位置を覚えておいて、決定(フォーカスアウト)時に使う
        stateMap.editPos = tateIndex;

        $(this).html('<input class="sktJyugyouName" type="text" value="' + temp + '">');

        $('.sktJyugyouName').focus();
      }
    });

    //テキストボックスからフォーカスが外れたら入力されていた値をセルに設定する
    $(document).on('blur', '.sktJyugyouName', function () {
      let inputstr;

      if (stateMap.edittingFlg == true) {
        inputstr = $('.sktJyugyouName').val(); // 一回目に$('.classname').val()を呼んだ時は
                                               // 値が取れたけど、2回目に読んだときは
                                               // 値が取れないことがあった。謎。
                                               // offしてるはずなのに
                                               // blurが何度も飛んできてる。謎。
        if (undefined !== inputstr) {
          stateMap.jyugyouEdit[stateMap.editPos-1].name = inputstr;

          $('.sktJyugyouName').parent().html(inputstr);
        }

        stateMap.edittingFlg = false;
      }
    });

    $(document).on('click', '.skt-kekka-jyugyou-edi-gakunen', function (event) {
      let tateIndex = $(this).closest('tr').index(), // ヘッダが1行で、0始まりだから1から
        temp = $(this).text();

      if (stateMap.edittingFlg == false) {

        // 合同名簿を設定すべきなのに誤って学年を入力してしまった場合に消す手段をつくる
        // すでに学年を入力済であるときに、クリックしたら学年と(整合性を保つために)クラスを消す
        if (Object.keys(stateMap.jyugyouEdit[tateIndex-1]).indexOf('gakunen') != -1) {
          delete stateMap.jyugyouEdit[tateIndex-1].gakunen;
          delete stateMap.jyugyouEdit[tateIndex-1].cls;

          $(this).html("");
          $(this).next().html("");

        // 学年が未入力なら
        } else {
          stateMap.edittingFlg = true;

          // 位置を覚えておいて、決定(onchange)時に使う
          stateMap.editPos = tateIndex;

          $(this).html('<select id="sktJyugyouGakunenID"></select>');
          let lst = document.getElementById('sktJyugyouGakunenID');
          lst.onchange = onGakunenIDChange;
          setGakunenListById('sktJyugyouGakunenID');
        }
      }
    });

    $(document).on('click', '.skt-kekka-jyugyou-edi-class', function (event) {
      let tateIndex = $(this).closest('tr').index(), // ヘッダが1行で、0始まりだから1から
        temp = $(this).text();

      if (stateMap.edittingFlg == false) {

        // 学年の情報が必要なので、学年が設定されていなければスルー
        if (Object.keys(stateMap.jyugyouEdit[tateIndex-1]).indexOf('gakunen') != -1) {
          stateMap.edittingFlg = true;

          // 位置を覚えておいて、決定(onchange)時に使う
          stateMap.editPos = tateIndex;

          $(this).html('<select id="sktJyugyouClassID"></select>');
          let lst = document.getElementById('sktJyugyouClassID');
          lst.onchange = onClassIDChange;
          setClassListById('sktJyugyouClassID', stateMap.jyugyouEdit[tateIndex-1].gakunen);
        }
      }
    });

    $(document).on('click', '.skt-kekka-jyugyou-edi-goudouMeibo', function (event) {
      let tateIndex = $(this).closest('tr').index(), // ヘッダが1行で、0始まりだから1から
        temp = $(this).text();

      if (stateMap.edittingFlg == false) {
        stateMap.edittingFlg = true;

        // 位置を覚えておいて、決定(フォーカスアウト)時に使う
        stateMap.editPos = tateIndex;

        $(this).html('<input class="sktJyugyouGoudouMeibo" type="text" value="' + temp + '">');

        $('.sktJyugyouGoudouMeibo').focus();
      }
    });

    //テキストボックスからフォーカスが外れたら入力されていた値をセルに設定する
    $(document).on('blur', '.skt-kekka-jyugyou-edi-goudouMeibo', function () {
      let inputstr;

      if (stateMap.edittingFlg == true) {

        inputstr = $('.sktJyugyouGoudouMeibo').val();

        // 何故か""は数値扱いみたい
        if (undefined !== inputstr && inputstr != "" && !isNaN(inputstr)) {
          stateMap.jyugyouEdit[stateMap.editPos-1].goudouMeiboId = Number(inputstr);

          // 合同名簿IDを指定するなら、学年とクラスは削除する
          delete stateMap.jyugyouEdit[stateMap.editPos-1].gakunen;
          delete stateMap.jyugyouEdit[stateMap.editPos-1].cls;

          $(this).prev().html("");
          $(this).prev().prev().html("");

        } else {
          delete stateMap.jyugyouEdit[stateMap.editPos-1].goudouMeiboId;
          inputstr = "";
        }

        $('.sktJyugyouGoudouMeibo').parent().html(inputstr);

        stateMap.edittingFlg = false;
      }
    });

    $(document).on('click', '.skt-kekka-jyugyou-edi-tanni', function (event) {
      let tateIndex = $(this).closest('tr').index(), // ヘッダが1行で、0始まりだから1から
        temp = $(this).text();

      if (stateMap.edittingFlg == false) {
        stateMap.edittingFlg = true;

        // 位置を覚えておいて、決定(フォーカスアウト)時に使う
        stateMap.editPos = tateIndex;

        $(this).html('<input class="sktJyugyouTanni" type="text" value="' + temp + '">');

        $('.sktJyugyouTanni').focus();
      }
    });

    //テキストボックスからフォーカスが外れたら入力されていた値をセルに設定する
    $(document).on('blur', '.sktJyugyouTanni', function () {
      let inputstr;

      if (stateMap.edittingFlg == true) {

        inputstr = $('.sktJyugyouTanni').val();

        // 何故か""は数値扱いみたい
        if (undefined !== inputstr && inputstr != "" && !isNaN(inputstr)) {
          stateMap.jyugyouEdit[stateMap.editPos-1].tanni = Number(inputstr);
        } else {
          delete stateMap.jyugyouEdit[stateMap.editPos-1].tanni;
          inputstr = "";
        }

        $('.sktJyugyouTanni').parent().html(inputstr);

        stateMap.edittingFlg = false;
      }
    });

    $(document).on('click', '.skt-kekka-jyugyou-del', function (event) {
      let tateIndex = $(this).closest('tr').index(); // ヘッダが1行で、0始まりだから1から

      // 該当箇所のアイテムを1個削除
      stateMap.jyugyouEdit.splice(tateIndex-1, 1);

      jqueryMap.$main.html("");
      createTable();
    });

    // 学年のリストを変更したら、クラスのリストを変更
    jqueryMap.$gakunenlist.change( function () {
      setClsList();
    });

    // 名簿タイプを変更したら、ドロップダウンリストを変更
    jqueryMap.$meiboType.change( function () {
      switchList();
    });

    jqueryMap.$update
      .click( onUpdate );
    jqueryMap.$cancel
      .click( onCancel );
    jqueryMap.$add
      .click( onAdd );

    return true;
  }

  removeKekkaJyugyou = function ( ) {
    //初期化と状態の解除
    if ( jqueryMap != null ) {
      if ( jqueryMap.$container ) {
        jqueryMap.$headline.remove();
        jqueryMap.$update.remove();
        jqueryMap.$cancel.remove();
        jqueryMap.$main.remove();
        jqueryMap.$add.remove();
        jqueryMap.$nameTitle.remove();
        jqueryMap.$nametext.remove();
        jqueryMap.$meiboType.remove();
        jqueryMap.$gakunenlist.remove();
        jqueryMap.$clslist.remove();
        jqueryMap.$meiboIdlist.remove();
        jqueryMap.$tanniListTitle.remove();
        jqueryMap.$tanniList.remove();
        //追加！！
      }
    }
    return true;
  }

  update = function () {
    skt.model.updateJyugyou(stateMap.jyugyouEdit);
  }

  return {
    configModule  : configModule,
    initModule    : initModule,
    removeKekkaJyugyou   : removeKekkaJyugyou,
    update        : update
  };
}());
