<?php
/**
 * Plugin Name: Confirm Plus Contact Form 7
 * Plugin URI: https://wcpn.jp/2021/10/13/cf7confirmplus/
 * Description: Add a confirmation function to Contact Form 7
 * Author: Trustring
 * Author URI: https://trustring.jp/
 * Text Domain: confirm-plus-contact-form-7
 * Domain Path: /languages
 * Version: 1.1.10
 * Tested up to: 6.5.5
 * License: GPL3 or later
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'WPCF7CP_VERSION', '1.0' );

if ( ! defined( 'WPCF7CP_PLUGIN_BASENAME' ) )
	define( 'WPCF7CP_PLUGIN_BASENAME', plugin_basename( __FILE__ ) );

if ( ! defined( 'WPCF7CP_PLUGIN_NAME' ) )
	define( 'WPCF7CP_PLUGIN_NAME', trim( dirname( WPCF7CP_PLUGIN_BASENAME ), '/' ) );

if ( ! defined( 'WPCF7CP_PLUGIN_DIR' ) )
	define( 'WPCF7CP_PLUGIN_DIR', untrailingslashit( dirname( __FILE__ ) ) );

if ( ! defined( 'WPCF7CP_PLUGIN_URL' ) )
	define( 'WPCF7CP_PLUGIN_URL', untrailingslashit( plugins_url( '', __FILE__ ) ) );

require_once WPCF7CP_PLUGIN_DIR . '/include/contact-form-7-cfm-pls-class.php';

