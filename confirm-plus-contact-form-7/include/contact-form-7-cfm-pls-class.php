<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class ContactForm7CfmPls {

	public function __construct() {
		// Contact Form 7 existence checks for admin notices & plugin page meta
		add_action( 'admin_notices', array( $this, 'wpcf7cp_check_for_manage_top' ) );
		add_filter( 'plugin_row_meta', array( $this, 'wpcf7cp_check_for_plugin_list' ), 10, 2 );

		// Load localization translations
		add_action( 'init', array( $this, 'wpcf7cp_load_textdomain' ) );

		// Enqueue scripts & styles for front-end
		add_action( 'wpcf7_enqueue_scripts', array( $this, 'wpcf7cp_enqueue_scripts' ) );
		add_action( 'wpcf7_enqueue_styles', array( $this, 'wpcf7cp_enqueue_styles' ) );

		// Intercept and skip mail during initial confirmation step
		add_filter( 'wpcf7_skip_mail', array( $this, 'wpcf7cp_skip_mail' ) );

		// Avoid spam detection and quiz validation issues when in confirmation screen
		add_filter( 'wpcf7_skip_spam_check', array( $this, 'wpcf7cp_skip_spam_check' ), 10, 2 );
		add_filter( 'wpcf7_validate_quiz', array( $this, 'wpcfcp_skip_quiz_validation' ), 5, 2 );

		// Adjust the AJAX response to return custom status code for front-end interception
		add_filter( 'wpcf7_feedback_response', array( $this, 'wpcf7cp_btn_status_back' ) );
	}

	/**
	 * Shows admin notices if Contact Form 7 is not activated or version is too old.
	 */
	public function wpcf7cp_check_for_manage_top() {
		if ( ! class_exists( 'WPCF7_ContactForm' ) ) {
			printf(
				'<div class="error"><p><strong>Contact Form 7 confirm plus: </strong>%s</p></div>',
				esc_html__( 'Contact Form 7 must be installed and activated', WPCF7CP_PLUGIN_NAME )
			);
		} else {
			// Version check
			if ( defined( 'WPCF7_VERSION' ) && version_compare( WPCF7_VERSION, '5.4.2', '<' ) ) {
				printf(
					'<div class="error"><p><strong>Contact Form 7 confirm plus: </strong>%s</p></div>',
					esc_html__( 'Contact Form 7 must be version 5.4.2 or later', WPCF7CP_PLUGIN_NAME )
				);
			}
		}
	}

	/**
	 * Appends check status messages to the plugin action links row.
	 */
	public function wpcf7cp_check_for_plugin_list( $links, $file ) {
		$pos = strpos( $file, '/' );
		if ( false !== $pos ) {
			$plugin_name = substr( $file, 0, $pos );

			if ( WPCF7CP_PLUGIN_NAME === $plugin_name ) {
				if ( ! class_exists( 'WPCF7_ContactForm' ) ) {
					$links[] = '<br /><br /><span style="color:red">※' . esc_html__( 'Contact Form 7 must be installed and activated', WPCF7CP_PLUGIN_NAME ) . '.</span>';
				} else {
					if ( defined( 'WPCF7_VERSION' ) && version_compare( WPCF7_VERSION, '5.4.2', '<' ) ) {
						$links[] = '<br /><br /><span style="color:red">※' . esc_html__( 'Contact Form 7 must be version 5.4.2 or later', WPCF7CP_PLUGIN_NAME ) . '.</span>';
					}
				}
			}
		}
		return $links;
	}

	/**
	 * Enqueues the plugin's frontend scripts and localizes required labels.
	 */
	public function wpcf7cp_enqueue_scripts() {
		$in_footer = true;
		if ( defined( 'WPCF7_LOAD_JS' ) && 'header' === WPCF7_LOAD_JS ) {
			$in_footer = false;
		}

		$data_arr = apply_filters( 'wpcf7cp_localize_data', array(
			'cfm_title_suffix'  => __( 'confirm', WPCF7CP_PLUGIN_NAME ),
			'cfm_btn'           => __( 'confirm', WPCF7CP_PLUGIN_NAME ),
			'cfm_btn_edit'      => __( 'edit', WPCF7CP_PLUGIN_NAME ),
			'cfm_btn_mail_send' => __( 'send mail', WPCF7CP_PLUGIN_NAME ),
			'checked_msg'       => __( 'checked', WPCF7CP_PLUGIN_NAME ),
		) );

		$src  = $this->get_plugin_url( 'assets/js/scripts.js' );
		
		// Enqueue without jQuery UI Dialog script dependency since we render custom markup
		wp_enqueue_script(
			'contact-form-7-confirm-plus',
			$src,
			array( 'contact-form-7' ),
			WPCF7CP_VERSION,
			$in_footer
		);

		wp_localize_script( 'contact-form-7-confirm-plus', 'data_arr', $data_arr );

		// Localize CF7 pipes translation map to resolve values on the frontend
		$pipes_data = array();
		if ( class_exists( 'WPCF7_ContactForm' ) ) {
			$forms = get_posts( array(
				'post_type'      => 'wpcf7_contact_form',
				'posts_per_page' => -1,
				'post_status'    => 'any',
			) );
			foreach ( $forms as $f ) {
				$cf = WPCF7_ContactForm::get_instance( $f->ID );
				if ( $cf ) {
					$tags = $cf->scan_form_tags();
					foreach ( $tags as $tag ) {
						if ( ! empty( $tag->pipes ) && $tag->pipes instanceof WPCF7_Pipes ) {
							$pipes = $tag->pipes;
							foreach ( $pipes->collect_befores() as $before ) {
								$pipes_data[$tag->name][$before] = $pipes->do_pipe( $before );
							}
						}
					}
				}
			}
		}
		wp_localize_script( 'contact-form-7-confirm-plus', 'wpcf7cp_pipes', $pipes_data );
	}

	/**
	 * Enqueues the plugin's custom layout stylesheets.
	 */
	public function wpcf7cp_enqueue_styles() {
		$src  = $this->get_plugin_url( 'assets/css/styles.css' );
		
		// Enqueue styles without jQuery UI style dependencies
		wp_enqueue_style(
			'contact-form-7-confirm-plus',
			$src,
			array( 'contact-form-7' ),
			WPCF7CP_VERSION,
			'all'
		);
	}

	/**
	 * Bypasses mail delivery on confirmation submit, sending only on final submit.
	 */
	public function wpcf7cp_skip_mail() {
		if ( isset( $_POST['_wpcf7cp'] ) && 'status_confirm' === sanitize_text_field( $_POST['_wpcf7cp'] ) ) {
			// Final submission state: allow mail delivery
			return false;
		} else {
			// Confirmation check state: skip sending mail
			remove_all_actions( 'wpcf7_submit' );
			return true;
		}
	}

	/**
	 * Skips the quiz validation when doing the final submit.
	 */
	public function wpcfcp_skip_quiz_validation( $result, $tag ) {
		if ( isset( $_POST['_wpcf7cp'] ) && 'status_confirm' === sanitize_text_field( $_POST['_wpcf7cp'] ) ) {
			// Confirmation submit state: bypass quiz filters
			remove_filter( 'wpcf7_validate_quiz', 'wpcf7_quiz_validation_filter', 10 );
		}
		return $result;
	}

	/**
	 * Skips spam check (e.g. reCAPTCHA) on the final submission after confirmation.
	 */
	public function wpcf7cp_skip_spam_check() {
		if ( isset( $_POST['_wpcf7cp'] ) && 'status_confirm' === sanitize_text_field( $_POST['_wpcf7cp'] ) ) {
			// Bypass reCAPTCHA false positives on final submit
			return true;
		}
		return false;
	}

	/**
	 * Rewrites the submission JSON response to indicate confirmation state.
	 */
	public function wpcf7cp_btn_status_back( $items ) {
		if ( isset( $_POST['_wpcf7cp'] ) && 'status_input' === sanitize_text_field( $_POST['_wpcf7cp'] ) && 'mail_sent' === $items['status'] ) {
			$items['message']  = '';
			$items['mailSent'] = false;
			$items['status']   = 'wpcf7cp_confirm';
		}
		return $items;
	}

	/**
	 * Generates plugin relative assets URLs.
	 */
	public function get_plugin_url( $path = '' ) {
		$url = untrailingslashit( WPCF7CP_PLUGIN_URL );

		if ( ! empty( $path ) && is_string( $path ) && false === strpos( $path, '..' ) ) {
			$url .= '/' . ltrim( $path, '/' );
		}

		return $url;
	}

	/**
	 * Initializes the localization file domains.
	 */
	public function wpcf7cp_load_textdomain() {
		load_plugin_textdomain( WPCF7CP_PLUGIN_NAME, false, WPCF7CP_PLUGIN_NAME . '/languages' );
	}
}

// Instantiate the class
$contactForm7CfmPls = new ContactForm7CfmPls();
