/**
 * Dialog that can be inserted to allow the user to export the current script using a variety of
 * formats, via builder.selenium1.adapter et al.
 */
builder.dialogs.exportscript = {};

/** The DOM node into which to insert the dialog, replacing its contents. */
builder.dialogs.exportscript.node = null;
builder.dialogs.exportscript.dialog = null;

builder.dialogs.exportscript.show = function(node) {
  builder.dialogs.exportscript.node = node;
  builder.dialogs.exportscript.dialog = newNode('div', {'class': 'dialog'});
  jQuery(node).append(builder.dialogs.exportscript.dialog);
  
  var format_list = newNode('ul');
  
  var cancel_b = newNode('a', _t('cancel'), {
    'class': 'button',
    'click': function () {
      builder.dialogs.exportscript.hide();
    },
    'href': '#cancel'
  });
  
  jQuery(builder.dialogs.exportscript.dialog).
      append(newNode('h3', _t('choose_export_format'))).
      append(format_list).
      append(newNode('p', cancel_b));
  
  // Option to overwrite the already-saved file.
  if (builder.getScript().path &&
      builder.getScript().path.where === "local")
  {
    jQuery(format_list).append(create_overwrite_li());
  }
  
  if (builder.getScript().seleniumVersion === builder.selenium2) {
    for (var i = 0; i < builder.selenium2.io.formats.length; i++) {
      jQuery(format_list).append(create_sel2_format_li(builder.selenium2.io.formats[i]));
    }
  } else {
    var formats = builder.selenium1.adapter.availableFormats();
    for (var i = 0; i < formats.length; i++) {
      jQuery(format_list).append(create_sel1_format_li(formats[i]));
    }
    if (builder.versionconverter.canConvert(builder.getScript(), builder.selenium2)) {
      jQuery(format_list).append(newNode("span", "Selenium 2:"));
      for (var i = 0; i < builder.selenium2.io.formats.length; i++) {
        jQuery(format_list).append(create_sel2_format_li(builder.selenium2.io.formats[i]));
      }
    } else {
      var iList = builder.versionconverter.nonConvertibleStepNames(builder.getScript(), builder.selenium2);
      var inconvertibles = "";
      for (var i = 0; i < iList.length; i++) {
        inconvertibles += iList[i] + " ";
      }
      jQuery(format_list).append(newNode("span", _t('sel2_unsaveable_steps') + ":", newNode("br"), inconvertibles));
    }
  }
};

builder.dialogs.exportscript.hide = function () {
  jQuery(builder.dialogs.exportscript.dialog).remove();
};

builder.dialogs.exportscript.do_export_sel1 = function(myFormat, hostPort, browserString) {
  if (hostPort) {
    myFormat.getFormatter().options.environment = browserString;
    var hAndP = hostPort.split(":");
    if (hAndP.length > 1) {
      myFormat.getFormatter().options.rcHost = hAndP[0];
      myFormat.getFormatter().options.rcPort = hAndP[1];
    }
  }
  var file = builder.selenium1.adapter.exportScriptWithFormat(
    builder.getScript(),
    myFormat);
  if (file) {
    builder.suite.setCurrentScriptSaveRequired(false);
    builder.getScript().path = 
      {
        where: "local",
        path: file.path,
        format: myFormat
      };
    builder.gui.suite.update();
    builder.suite.broadcastScriptChange();
  }
  builder.dialogs.exportscript.hide();
};

/**
 * Creates a li node for selecting a format to export with.
 * @param format The format to export with.
 */
function create_sel1_format_li(myFormat) {
  var li_node = newNode('li',
    newNode('a', myFormat.name, {
      click: function(event) {
        if (myFormat.name === "HTML") {
          builder.dialogs.exportscript.do_export_sel1(myFormat);
        } else {
          builder.dialogs.rc.show(builder.dialogs.exportscript.node, null, function(hostPort, browserString) {
              builder.dialogs.exportscript.do_export_sel1(myFormat, hostPort, browserString);
            }, _t('save'));
        }
      },
      href: '#export-' + myFormat.id
    })
  );
  return li_node;
}

function create_sel2_format_li(myFormat) {
  var script = builder.getScript();
  if (script.seleniumVersion === builder.selenium1) {
    script = builder.versionconverter.convertScript(script, builder.selenium2);
  }
  var nonExportables = myFormat.nonExportables(script);
  if (nonExportables.length > 0) {
    var l = "";
    var max = nonExportables.length > 3 ? 3 : nonExportables.length;
    for (var i = 0; i < max; i++) {
      if (i !== 0) { l += ", "; }
      l += nonExportables[i];
    }
    if (nonExportables.length > 3) {
      l += "...";
    }
    return newNode('li', newNode('strike', myFormat.name), " " + _t('unsupported_steps') + ": " + l);
  }
  var li_node = newNode('li',
    newNode('a', myFormat.name, {
      click: function(event) {
        builder.selenium2.io.saveScript(script, myFormat, null, function(success) {
          if (success) {
            builder.suite.setCurrentScriptSaveRequired(false);
            builder.gui.suite.update();
          }
        });
        builder.dialogs.exportscript.hide();
      },
      href: '#export-sel2'
    })
  );
  return li_node;
}

/** Creates a li node for overwriting the existing file. */
function create_overwrite_li() {
  var script = builder.getScript();
  var path = script.path;
  return newNode('li', newNode('a', _t('save_as_X_to_Y', path.format.name, path.path), {
    click: function(event) {
      if (builder.getScript().seleniumVersion === builder.selenium1) {
        if (builder.selenium2.io.formats.indexOf(path.format) !== -1) {
          script = builder.versionconverter.convertScript(script, builder.selenium2);
        } else {
          var file = builder.selenium1.adapter.exportScriptWithFormatToPath(
            script,
            path.format,
            path.path);
          if (file) {
            builder.suite.setCurrentScriptSaveRequired(false);
            builder.gui.suite.update();
          }
        }
      }
      if (script.seleniumVersion === builder.selenium2) {
        if (builder.selenium2.io.saveScript(script, path.format, path.path)) {
          builder.suite.setCurrentScriptSaveRequired(false);
          builder.gui.suite.update();
        }
      }
      builder.dialogs.exportscript.hide();
    },
    href: '#export-overwrite'
  }));
}