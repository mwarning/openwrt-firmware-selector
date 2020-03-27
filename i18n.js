
var translations = {
	'de': {
		'tr-load': 'Lade die OpenWrt Firmware für dein Gerät!',
		'tr-title': 'OpenWrt Firmware Selector',
		'tr-message': 'Bitte benutze die Eingabe um die passende Firmware zu finden!',
		'tr-version-build': 'Release Build',
		'tr-custom-build': 'Custom Build',
		'tr-customize': 'Customize',
		'tr-request-build': 'Request Build',
		'tr-model': 'Model:',
		'tr-target': 'Target',
		'tr-version': 'Version:',
		'tr-date': 'Datum',
		'tr-downloads': 'Downloads',
		'tr-custom-downloads': 'Custom Downloads',
		'tr-factory-help': 'Factory Abbilder werden über die Weboberfläche der originalen Firmware eingespielt.',
		'tr-sysupgrade-help': 'Sysupgrade Abbilder werden für Geräte verwendet, die bereits OpenWrt laufen haben. Es ist möglich, existierende Einstellungen beizubehalten.',
		'tr-kernel-help': 'Linux Kernel als separates Abbild.',
		'tr-rootfs-help': 'Das Root Dateisystem als separates Abbild.',
		'tr-sdcard-help': 'Image für SD Speicherkarten.',
		'tr-tftp-help': 'TFTP Dateien können verwendet werden, um ein Gerät über die TFTP Method des Bootloader zu flashen.',
		'tr-other-help': 'Sonstiger Imagetyp.'
	},
	'en': {
		'tr-load': 'Download OpenWrt firmware for your device!',
		'tr-title': 'OpenWrt Firmware Selector',
		'tr-message': 'Please use the input below to download firmware for your device!',
		'tr-version-build': 'Build',
		'tr-custom-build': 'Custom Build',
		'tr-customize': 'Customize',
		'tr-request-build': 'Request Build',
		'tr-model': 'Modell:',
		'tr-target': 'Platform:',
		'tr-version': 'Version:',
		'tr-date': 'Date',
		'tr-downloads': 'Downloads',
		'tr-custom-downloads': 'Custom Downloads',
		'tr-factory-help': 'Factory images are for flashing routers with OpenWrt for the first time. Usually via the web interface of the original firmware.',
		'tr-sysupgrade-help': 'Sysupgrade images are for flashing routers that already run OpenWrt. The image can be applied using the web interface or the terminal.',
		'tr-kernel-help': 'Linux kernel as a separate image.',
		'tr-rootfs-help': 'Root file system as a separate image.',
		'tr-sdcard-help': 'Image that is meant to be flashed onto a SD-Card.',
		'tr-tftp-help': 'TFTP images are used to flash a device via the TFTP method of the bootloader.',
		'tr-other-help': 'Other image type.'
	}
};

// Complement translations based on other translations
//translations['en'] = Object.assign({}, translations['de'], translations['en']);
