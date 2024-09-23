(function ($) {
	// IEなら処理回避
	var userAgent = window.navigator.userAgent.toLowerCase();
	if (userAgent.indexOf('msie') != -1 || userAgent.indexOf('trident') != -1) {
		return;
	}


	// 初期表示時
	$( 'input[name=_wpcf7]' ) . each( function() {
		$(this).after('<input type="hidden" name="_wpcf7cp" value="status_input" />');
		return false;
	});


	// ボタンラベルの変更
	$( 'form.wpcf7-form input.wpcf7-submit' ) . attr( 'value', data_arr . cfm_btn );
	$( 'form.wpcf7-form button.wpcf7-submit' ).text( data_arr . cfm_btn );


	// 初期値の保持
	var resetValues = $( 'form.wpcf7-form' ) . serializeArray();


	// フォームのリセット
	var resetForm = function() {
		var formObj = $( 'form.wpcf7-form' );
		for ( var i = 0; i < resetValues . length; i++ ) {
			formObj . find( '[name=' + resetValues[i] . name + ']' ) . val( resetValues[i] . value );
		}
		formObj . find( ':file' ) . val( null );
	};


	// サニタイズ＆改行コード変換
	var sanitizeText = function( textVal ) {
		return textVal.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/`/g, '&#x60;').replace(/\r?\n/g, '<br>');
	};


	// テキストセットの取得
	var getTextSet = function( inputObj ) {
		var textSetObj = inputObj . closest( '.text-set-contactform7' );
		if ( ! textSetObj ) {
			return null;
		}
		var textSetObjClone = textSetObj . clone();
		var inputToReplaces = textSetObjClone . find( 'input, select' );
		for ( var i = 0; i < inputToReplaces . length; i++ ) {
			var inputToReplace = $( inputToReplaces[i] );
			var inputName = inputToReplace . attr( 'name' );
			if ( inputName ) {
				inputToReplace . replaceWith( '{%' + inputName . replace( '[]', '' ) + '%}' );
			}
		}
		return textSetObjClone . text();
	};

	// 区切り文字（将来的にWP管理画面から設定可能に？）
	var splitter = ', ';


	// 確認ボタン押下で確認画面を表示
	var wpcf7cp_confirm = function(unit_tag) {
		const NEW_LINE_CODE = /\r\n|\r|\n/;	// 改行コード
		const PATH_CODE = /[\\\/]/;			// Path区切りコード

		// ステータスを入力状態から確認状態に変更
		changeFormStatus( 'confirm' );

		var textAreaList = new Array(); 			// テキストエリアのタイトル名を保持するリスト
		var noTitleDammyStr = 'CF7CfmPlsNoTitle';	// タイトルが存在しない場合のダミー文字列
		var noTitleOuterHTMLs = [];					// タイトルが存在しない親P要素のHTML配列

		var dispList = {}; // タイトル、入力値を保持するリスト

		// 対象フォーム検索
		$( 'input[name=_wpcf7_unit_tag]' ).each(function(){
			if($(this).val() == unit_tag) {
				var formElm = $(this).parents("form");

				// 送信完了メッセージを非表示にする
				var responseOutput = formElm.find('div.wpcf7-response-output');
				responseOutput.addClass("wpcf7cp-force-hide");

				// 入力値取得: avoid-confirmクラス付与要素は回避
				formElm . find( 'input, select, textarea' ) . filter( ':visible:not(.avoid-confirm)' ) . each( function() {
					var title = null;
					var val = null;
					var tagName = $(this).prop("tagName");

					var name = $( this )  . attr( 'name' );
					if ( name ) name = name . replace( '[]' , '' );

					if ("INPUT" == tagName) {
						var inputType = $(this).attr("type");

						switch (inputType) {
							case "submit":
							case "button":
							case "hidden":
							case "image":
								// 処理不要
								break;
							case "radio":
							case "checkbox":
								if ( ! $(this) . is( ':checked' ) ) {
									break;
								}

								title = wpcf7cp_get_title( $( this ) );

								val = $( this ) . val();
								if( '1' === val || 'on' === val ) {
									val = data_arr . checked_msg;
								}
								break;

							case "file":
								title = wpcf7cp_get_title($(this));
								val = $(this).val().split(PATH_CODE).pop();
								break;

							default:
								if ( $( this ) . hasClass( 'wpcf7-quiz' ) ) {
									// CF7の送信可否判定用クイズは確認項目としない
									return;
								}
								title = wpcf7cp_get_title($(this));
								// サニタイズ
								val = sanitizeText( $(this).val() );
						}

					} else if ("TEXTAREA" == tagName) {
						title = wpcf7cp_get_title($(this));
						// サニタイズ＆改行コード変換
						val = sanitizeText( $(this).val() );
						textAreaList.push(title);

					} else if("SELECT" == tagName) {
						title = wpcf7cp_get_title($(this));
						val = $(this) . val();
					}

					// 有効なタイトルのない場合はouterHTMLに基づくシステム文字列を適用
					if ( ! title ) {
						var outerHTML = $( this ) . parents( 'p' ) . prop( 'outerHTML' );
						var k = $ . inArray( outerHTML, noTitleOuterHTMLs );
						if ( k === -1 ) {
							// 同一のouterHTMLが未格納なら新たなINPUTセットとして処理
							noTitleOuterHTMLs . push( outerHTML );
							k = noTitleOuterHTMLs . length - 1;
						}
						title = noTitleDammyStr + k;
					}

					// 入力値をリストにセット
					if ( title !== null && val !== null ) {
						if ( ! dispList[title] ) {
							dispList[title] = {
								values: {},
								textSet: getTextSet( $( this ) )
							};
						}
						if ( typeof dispList[title]['values'][name] === 'undefined' ) {
							dispList[title]['values'][name] = '';
						} else {
							dispList[title]['values'][name] += splitter;
						}
						dispList[title]['values'][name] += ( typeof val === 'object' ? val . join( splitter ) : val );	// multiple selectならjoin()
					}
				});

				// form全体を非表示にする
				formElm.addClass('wpcf7cp-form-hide');
			}
		});

		// 確認画面表示
		$( 'div.wpcf7' ).each(function(){
			var cfm_btn_edit = data_arr.cfm_btn_edit;				// 修正ボタン名
			var cfm_btn_mail_send = data_arr.cfm_btn_mail_send;		// この内容で送信するボタン名

			// 確認内容生成
			var wrapperDivObj = $( '<div id="wpcf7cpcnf">' ) . appendTo( this );
			var tableObj = $( '<table>' ) . appendTo( wrapperDivObj );
			for (key in dispList) {
				// タイトルが空欄の場合
				var keyToShow = key;
				var regexp = new RegExp( '^' + noTitleDammyStr + '[0-9]+$');
				if ( keyToShow . match( regexp ) ) {
					// システム文字列を除去して空タイトル表示
					keyToShow = '';
				}

				var title = $( '<p>' ) . text( keyToShow );
				var titleElm = $( '<th>' ) . append( title );
				var val = '';
				if ( ! dispList[key]['textSet'] ) {
					for ( k in dispList[key]['values'] ) {
						if ( val !== '' ) {
							val += splitter;
						}
						val += dispList[key]['values'][k];
					}
					val = '<p>' + val + '</p>';
				} else {
					val = dispList[key]['textSet'];
					for ( k in dispList[key]['values'] ) {
						val = val . replace( new RegExp( '\{%' + k + '%\}', 'g' ), String( dispList[key]['values'][k] ) );
					}
				}
				var valElm = $( '<td>' ) . append( val );
				var rowElm = $( '<tr>' ) . append( titleElm ) . append( valElm );

				tableObj . append( rowElm );
			}

			// 修正、送信ボタン生成
			var btnTableElm = $( '<div class="wpcf7cp-btns">' ) . append(
				$(
					'<button type="button" class="wpcf7-form-control wpcf7cp-cfm-edit-btn">' + cfm_btn_edit + '</button>'
				) . click( function() {
					wpcf7cp_edit();
					changeFormStatus( 'input' );
				} )
			) . append(
				$(
					'<button type="button" class="wpcf7-form-control wpcf7-submit wpcf7cp-cfm-submit-btn">' + cfm_btn_mail_send + '</button>'
				) . click( function() {
					wpcf7cp_mail_send();
				} )
			);
			wrapperDivObj . append( btnTableElm );

			// 確認画面トップまでスクロール
			var position = $(this).offset().top;

			var popupHeight = $( '#wpcf7cpcnf' ) . height();
			var windowHeight = document.documentElement . clientHeight;

			var topOffset = 50;
			if ( popupHeight < windowHeight ) {
				// 確認ポップアップの高さがブラウザ高さより小さければ上下中央表示
				topOffset = Math . round( ( windowHeight - popupHeight ) / 2 );
			}

			var speed = 500;
			$("html, body").animate({scrollTop: position - topOffset }, speed, "swing");
		});
	}


	// 確認画面から「修正」ボタンで編集画面に復帰
	var wpcf7cp_edit = function(){
		// 確認画面の修正ボタン押下時の処理
		// 非表示としたformを再表示する
		$( '.wpcf7cp-form-hide' ) . each( function() {
			$(this).removeClass("wpcf7cp-form-hide");
		});

		// 確認画面を閉じる
		$( '#wpcf7cpcnf' ) . each( function() {
			$(this) . remove();
			return false;
		});
	}


	// 入力フォームのステータスをinput/confirmに変更
	var changeFormStatus = function( statusTo ) {
		if ( -1 === $ . inArray( statusTo, ['input', 'confirm'] ) ) {
			return;
		}

		$( 'input[name=_wpcf7cp]' ) . each( function() {
			$( this ) . val( 'status_' + statusTo );
			return false;
		});
	};


	// 確認画面からメールを送信
	var wpcf7cp_mail_send = function(){
		// 確認画面の、この内容で送信するボタン押下時の処理
		// $( '.wpcf7-form' ) . submit();

		// フォーム送信と確認画面除去
		var submitButton = $( 'form.wpcf7-form .wpcf7-submit' );
		var forms = submitButton . parents( 'form' );
		var responseOutput = forms . find( 'div.wpcf7-response-output' );
		forms . one( 'submit', function() {
			// clickイベントによるsubmitイベント発生後に実行
			setTimeout( function() {
				responseOutput . removeClass( 'wpcf7cp-force-hide' );
				wpcf7cp_edit();
			} );
		} );
		submitButton . click();

		// プログレス表示
		var progressContents = $( '<div class="wpcf7cp-progress-cover"></div><div class="wpcf7cp-progress-content"><p>Progress...</p></div>' ) . appendTo( forms[0] );
		progressContents . height( progressContents . height() );	// height: 100%を絶対値に変換して送信完了メッセージ読み込み時のガタつき防止

		// AJAXメッセージの反映を待ってスクロール
		var intervalId = setInterval( function() {
			// メッセージ反映チェック
			if ( ! responseOutput . text() . length || ! responseOutput . is( ':visible' ) ) {
				return;
			}

			// フォーム初期化
			resetForm();
			changeFormStatus( 'input' );

			// プログレス表示の除去
			progressContents . remove();

			// メッセージ表示箇所までスクロール
			var responsePosi = responseOutput . offset() . top;
			var scrollToPosi = responsePosi - ( $( window ) . height() / 2 );
			$( 'html, body' ) . animate( { scrollTop: scrollToPosi }, 500, 'swing' );

			// 定時処理終了
			clearInterval( intervalId );
		}, 300 );
	}


	// タイトル取得
	var wpcf7cp_get_title = function (element) {
		var title = null;

		var makeTitle = function( titleObj ) {
			var titleObjClone = titleObj . clone();
			titleObjClone . find( '.avoid-confirm' ) . remove();
			if (titleObjClone.length > 1) {
				titleObjClone = titleObjClone.first();
			}
			return $ . trim( titleObjClone . text() );
		};

		// タイプの取得
		var thisObj = $( element );
		var inputType = thisObj . attr( 'type' );

		// checkbox/radioの場合はlegend要素を最優先
		if ( inputType === 'checkbox' || inputType === 'radio' ) {
			var legend = thisObj . closest( 'fieldset' ) . find( 'legend' );
			if ( legend . length ) {
				// filedset/legendが適用されていればタイトルに使用
				title = makeTitle( legend );
			}
		}

		if ( ! title ) {
			// name対応label要素によるタイトル取得
			var nameVal = thisObj . attr( 'name' )  . replace(/\[\]$/, '');
			if ( inputType !== 'radio' ) {
				var labelObjWithForAttr = $( 'label[for="' + nameVal + '"]' );
				if ( labelObjWithForAttr ) {
					title = makeTitle( labelObjWithForAttr );
				}

				// 親label要素（CF7方式）でのタイトル取得
				if ( ! title && inputType !== 'checkbox' ) {
					var closestLabelObj = thisObj . closest( 'label' );
					if ( closestLabelObj ) {
						if ( 'SELECT' == thisObj . prop( 'tagName' ) ) {
							// セレクトメニューなら複製→オプション要素を除去
							closestLabelObjClone = closestLabelObj . clone();
							closestLabelObjClone . find( 'option' ) . remove();
							title = makeTitle( closestLabelObjClone );
						} else {
							title = makeTitle( closestLabelObj );
						}
					}
				}
			}

			// クラス名による明示に対応
			if ( ! title ) {
				var classLabelObj = $( '.title-contactform7.for-' + ( nameVal ) );
				if ( classLabelObj ) {
					title = makeTitle( classLabelObj );
				}
			}

			// テーブルの同一行に存在する.title-contactform7要素に対応
			if ( ! title ) {
				var closestTrObj = thisObj . closest( 'tr' );
				if ( closestTrObj ) {
					var labelInSameTrObj = closestTrObj . find( '.title-contactform7' );
					if ( labelInSameTrObj ) {
						title = makeTitle( labelInSameTrObj );
					}
				}
			}

			// 親label要素（CF7方式）の単独チェックボックスに対応（規約確認など）
			if ( ! title && inputType === 'checkbox' ) {
				var closestLabelObj = thisObj . closest( 'label' );
				if ( closestLabelObj ) {
					title = makeTitle( closestLabelObj );
				}
			}
		}

		return title;
	};


	// CF7のAJAXイベント
	document . addEventListener( 'wpcf7submit', function( event ) {
		if ( 'wpcf7cp_confirm' === event.detail.status) {
			wpcf7cp_confirm( event.detail.unitTag );
		}
	}, false );
} )( jQuery );
