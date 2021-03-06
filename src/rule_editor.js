var selectedNode = null;
var origStyle = null;
var origHref = null;


/**
 * RuleEditor
 */
var RuleEditor = function (rule, src, appliedRuleList) 
{
	this.rule = (rule)?rule:Rule.createInstance();
	this.src = src;
	this.appliedRuleList = appliedRuleList;
};
RuleEditor.prototype.initialize = function () 
{
	var nodes = document.body.getElementsByTagName('*');
	this.maxZIndex = RuleEditor.getMaxZIndex();
	RuleExecutor.stopBlockAction();
	
	for (var i=0; i<nodes.length;  i++) 
	{		
		var node = nodes[i];
		node.addEventListener('mouseover', this.getOnMouseoverAction(node), false);
		node.addEventListener('mouseout', this.getOnMouseoutAction(node), false);
		node.addEventListener('click', this.getOnClickAction(node), false);
		RuleElement.appendFunctions(node);
	}
	
	this.pathPickerDialog = new PathPickerDialog(this.maxZIndex + 2, this);
	this.ruleEditorDialog = new RuleEditorDialog(this.rule, this.src, this.maxZIndex + 1, this);
	this.ruleEditorDialog.refreshXPathSelectedStyles();
	this.ruleEditorDialog.refreshPathSections();
	CustomBlockerUtil.enableFlashZIndex();
};

RuleEditor.prototype.getOnMouseoverAction = function (node) 
{
	var self = this;
	return function (event)
	{
		if (window.ruleEditor && selectedNode ==null && self.ruleEditorDialog && self.ruleEditorDialog.pathPickerTarget) 
		{
			selectedNode = node;
			origStyle = selectedNode.style.outline;
			origHref = selectedNode.href;
			selectedNode.href = 'javascript:void(0)'
			if (self.ruleEditorDialog.pathPickerTarget.none && selectedNode.unfocus) 
			{
				selectedNode.unfocus();
			}
			else if (self.ruleEditorDialog.pathPickerTarget.isToHide && selectedNode.focusForSearch) 
			{
				selectedNode.focusForHide();
			}
			else if (self.ruleEditorDialog.pathPickerTarget.isToSearch && selectedNode.focusForHide) 
			{
				selectedNode.focusForSearch();
			}
			return;
		}
		event.stopPropagation();
		event.preventDefault();
	}
};

RuleEditor.prototype.onSaveDone = function (rule)
{
	this.rule.rule_id = rule.rule_id;
	for (var i=0, l=this.rule.words.length; i<l; i++)
	{
		this.rule.words[i].word_id = rule.words[i].word_id;
	}
	this.ruleEditorDialog.showMessage(chrome.i18n.getMessage('saveDone'));
}

RuleEditor.prototype.getOnClickAction = function (node) 
{
	var self = this;
	return function (event) 
	{
		if (!window.ruleEditor || !self.ruleEditorDialog.pathPickerTarget || self.ruleEditorDialog.pathPickerTarget.none)
			return;
		if (selectedNode ==node) 
		{
			var analyzer = new PathAnalyzer(node, self.ruleEditorDialog.pathPickerTarget.getPathBuilder());
			var list = analyzer.createPathList();
			self.pathPickerDialog.show(event, list, self.ruleEditorDialog.pathPickerTarget);
		}
		event.stopPropagation();
		event.preventDefault();
	}
};

RuleEditor.prototype.getOnMouseoutAction = function (node) 
{
	return function (event) 
	{
		if (window.ruleEditor && selectedNode) 
		{
			selectedNode.style.outline = origStyle;
			selectedNode.href = origHref;
		}
		selectedNode = null;
	}
};

RuleEditor.getMaxZIndex = function () 
{
	var max = 1;
	var elements = document.getElementsByTagName('*');
	for (var i=0, l=elements.length; i<l; i++) 
	{
		var element = elements[i];
		var style = window.getComputedStyle(element);
		
		if (style && style.zIndex && 'auto'!=style.zIndex && parseInt(style.zIndex)>max)
		{
			max = parseInt(style.zIndex);
		}
	}
	return max;
};
RuleEditor.prototype.getSuggestedXPath = function (_node) 
{
	var node = _node;
	var xpath = node.tagName;
	if (node.className) xpath = node.tagName + '[@class="'+node.className+'"]';
	var idFound = false;
	while (node) 
	{
		if (node.id) 
		{
			xpath = "id('"+node.id+"')//" + xpath;
			idFound = true;
			break;
		} 
		node = node.parentNode;
	}
	if (!idFound) xpath = "//"+xpath ;
	return xpath;
};

RuleEditor.prototype.save = function () 
{
	var dialog = this.ruleEditorDialog;
	var validateErrors = Rule.Validator.validate({
		title : dialog.title.value,
		site_regexp : dialog.site_regexp.value,
		example_url : dialog.example_url.value,
		site_description : dialog.site_description.value,
		search_block_xpath : dialog.search_block_xpath.value,
		search_block_css : dialog.search_block_css.value,
		search_block_description : dialog.search_block_description.value,
		hide_block_xpath : dialog.hide_block_xpath.value,
		hide_block_css : dialog.hide_block_css.value,
		hide_block_description : dialog.hide_block_description.value
	});
	if (validateErrors.length>0)
	{
		this.ruleEditorDialog.showMessage(validateErrors.join('<br/>'));
		return;
	}
	// set UUIDs
	if (CustomBlockerUtil.isEmpty(this.rule.user_identifier))
	{
		this.rule.user_identifier = UUID.generate();
	}
	if (CustomBlockerUtil.isEmpty(this.rule.global_identifier))
	{
		this.rule.global_identifier = UUID.generate();
	}
	this.applyInput();
	this.rule.changed = false;
	window.bgProcessor.sendRequest('db', {dbCommand:'save', type:'rule', obj: this.rule}, 'ruleSaveDoneRuleEditor');
	
};
RuleEditor.prototype.applyInput = function ()
{
	var dialog = this.ruleEditorDialog;
	this.rule.title = dialog.title.value;
	this.rule.site_regexp = dialog.site_regexp.value;
	this.rule.example_url = dialog.example_url.value;
	this.rule.site_description = dialog.site_description.value;
	this.rule.search_block_xpath = dialog.search_block_xpath.value;
	this.rule.search_block_css = dialog.search_block_css.value;
	this.rule.search_block_by_css = dialog.radio_search_css.checked;
	this.rule.search_block_description = dialog.search_block_description.value;
	this.rule.hide_block_xpath = dialog.hide_block_xpath.value;
	this.rule.hide_block_css = dialog.hide_block_css.value;
	this.rule.hide_block_by_css = dialog.radio_hide_css.checked;
	this.rule.hide_block_description = dialog.hide_block_description.value;
	this.rule.block_anyway = dialog.block_anyway.checked;
	this.rule.specify_url_by_regexp = dialog.specify_url_by_regexp_checkbox.checked;
	
};
RuleEditor.prototype.addWord = function(wordStr)
{
	console.log("addWord word=" + wordStr);
	if (!wordStr || ''==wordStr) return; //Empty
	var word = new Word();
	
	word.word = wordStr;
	word.isNew = 'true';
	var checked = document.getElementById('rule_editor_keyword_regexp_checkbox').checked;
	word.is_regexp = checked;
	if (word.is_regexp) {
		// Check if received RegExp is valid
		try {
			new RegExp(wordStr);
		} catch (ex) {
			alert(chrome.i18n.getMessage('invalidRegEx'));
			return false;
		}
	}
	
	word.dirty = true;
	
	var span = this.getWordElement(word)
	document.getElementById('rule_editor_keywords').appendChild(span);
	
	this.rule.words.push(word);
	
	if (this.rule.rule_id>0) 
	{
		word.rule_id = this.rule.rule_id;
	}
	else 
	{
		word.rule_id=0;
	}
	
	return true;
};

RuleEditor.prototype.getWordElement = function (word) 
{
	return CustomBlockerUtil.createWordElement(word, this.getWordDeleteAction(word));
};
RuleEditor.prototype.getWordDeleteAction = function (word) 
{
	var self = this;
	return function (span) 
	{
		span.parentNode.removeChild(span);
		word.deleted = true;
		word.dirty = true;
	};
};

/**
 * RuleEditorDialog
 */

var RuleEditorDialog = function(rule, src, _zIndex, ruleEditor) 
{
	this.ruleEditor = ruleEditor;
	this.div = document.createElement('DIV');
	this.div.id='rule_editor_container';
	this.rule = rule;
	
	with (this.div.style) 
	{
		zIndex = _zIndex;
		top = '10px';
		right = '10px';
	}
	document.body.appendChild(this.div);
	this.div.innerHTML = src;
	
	CustomBlockerUtil.applyCss('/css/rule_editor.css');
	CustomBlockerUtil.applyCss('/css/rule_editor_common.css');
	CustomBlockerUtil.applyCss('/css/keywords.css');
	CustomBlockerUtil.applyCss('/css/rule_editor_cursor.css');	
	
	this.div.avoidStyle = true;
	
	{
		var nodes = this.div.getElementsByTagName('*');
		for (var i=0, l=nodes.length; i<l; i++) nodes[i].avoidStyle = true;
		
	}
	for (var i = 0, l = rule.words.length; i < l; i++) 
	{
		var word = rule.words[i];
		var span = ruleEditor.getWordElement(word)
		document.getElementById('rule_editor_keywords').appendChild(span);
	}
	
	this.title = document.getElementById('rule_editor_title');
	this.site_regexp = document.getElementById('rule_editor_site_regexp');
	this.specify_url_by_regexp_checkbox = document.getElementById('specify_url_by_regexp_checkbox');
	this.example_url = document.getElementById('rule_editor_example_url');
	this.site_description = document.getElementById('rule_editor_site_description');
	this.search_block_xpath = document.getElementById('rule_editor_search_block_xpath');
	this.search_block_css = document.getElementById('rule_editor_search_block_css');
	this.radio_search_css = document.getElementById('rule_editor_radio_search_css');
	this.radio_search_xpath = document.getElementById('rule_editor_radio_search_xpath');
	this.search_block_description = document.getElementById('rule_editor_search_block_description');
	this.hide_block_xpath = document.getElementById('rule_editor_hide_block_xpath');
	this.hide_block_css = document.getElementById('rule_editor_hide_block_css');
	this.radio_hide_css = document.getElementById('rule_editor_radio_hide_css');
	this.radio_hide_xpath = document.getElementById('rule_editor_radio_hide_xpath');
	this.hide_block_description = document.getElementById('rule_editor_hide_block_description');
	this.block_anyway = document.getElementById('rule_editor_block_anyway');
	this.block_anyway_false = document.getElementById('rule_editor_block_anyway_false');
	this.hide_detail = document.getElementById('rule_editor_hide_detail');

	if (rule.rule_id && rule.rule_id > 0) 
	{
		this.title.value = rule.title;
		this.site_regexp.value = rule.site_regexp;
		this.example_url.value = rule.example_url;
		this.site_description.value = rule.site_description;
		this.search_block_xpath.value = rule.search_block_xpath;
		this.search_block_css.value = rule.search_block_css;
		((rule.search_block_by_css)?this.radio_search_css:this.radio_search_xpath).checked = true;
		this.search_block_description.value  = rule.search_block_description;
		this.hide_block_xpath.value = rule.hide_block_xpath;
		this.hide_block_css.value = rule.hide_block_css;
		((rule.hide_block_by_css)?this.radio_hide_css:this.radio_hide_xpath).checked = true;
		this.hide_block_description.value = rule.hide_block_description;
		((rule.block_anyway)?this.block_anyway:this.block_anyway_false).checked = true;
		this.specify_url_by_regexp_checkbox.checked = rule.specify_url_by_regexp;

		this.setBlockAnywayStyle(this.block_anyway.checked);
		document.getElementById('rule_editor_keyword').focus();
	}
	else 
	{
		
		this.site_regexp.value = location.href;
		this.site_description.value = document.title;
		this.title.value = document.title;
		this.example_url.value = location.href;
		this.block_anyway_false.checked = true;
	}
	var dragger = document.getElementById('rule_editor_body_drag');
	dragger.addEventListener('mousedown', this.getOnMousedownAction(), false);
	document.body.addEventListener('mousemove', this.getOnMousemoveAction(), false);
	document.body.addEventListener('mouseup', this.getOnMouseupAction(), false);
	
	document.getElementById('rule_editor_closer').addEventListener('click', this.getCloseAction(), false);
	document.getElementById('rule_editor_close_button').addEventListener('click', this.getCloseAction(), false);

	this.radio_hide_xpath.addEventListener('change', this.getRefreshPathSecionsAction(), false);
	this.radio_hide_css.addEventListener('change', this.getRefreshPathSecionsAction(), false);
	this.radio_search_xpath.addEventListener('change', this.getRefreshPathSecionsAction(), false);
	this.radio_search_css.addEventListener('change', this.getRefreshPathSecionsAction(), false);
	
	this.pathPickerTarget = PathPickerDialog.targetNone;
	var self = this;
	// Add event listeners to path picker buttons
	document.getElementById('rule_editor_button_search_block_xpath').addEventListener('click', 
			function()
			{
				self.hideCover();
				self.pathPickerTarget = PathPickerDialog.targetSearchXpath;
				}, false);
	document.getElementById('rule_editor_button_search_block_css').addEventListener('click', 
			function()
			{
				self.hideCover();
				self.pathPickerTarget = PathPickerDialog.targetSearchCss;
				}, false);
	document.getElementById('rule_editor_button_hide_block_xpath').addEventListener('click', 
			function(){
				self.hideCover();
				self.pathPickerTarget = PathPickerDialog.targetHideXpath;
			}, false);
	document.getElementById('rule_editor_button_hide_block_css').addEventListener('click', 
			function(){
				self.hideCover();
				self.pathPickerTarget = PathPickerDialog.targetHideCss;
			}, false);
	
	document.getElementById('rule_editor_save_button').addEventListener('click',
			function()
			{
				window.ruleEditor.save();
			}, 
		true);
	document.getElementById('rule_editor_keyword').addEventListener ('keydown',
		function(e)
		{
			if (KEY_CODE_RETURN==e.keyCode) 
			{
				if (window.ruleEditor.addWord(document.getElementById('rule_editor_keyword').value))
					document.getElementById('rule_editor_keyword').value = '';
			}
		}, 
		true);
	document.getElementById('rule_editor_add_keyword_button').addEventListener ('click',
		function()
		{
			if (window.ruleEditor.addWord(document.getElementById('rule_editor_keyword').value))
				document.getElementById('rule_editor_keyword').value = '';
		}, 
		true);
	this.hide_block_xpath.addEventListener ('keyup',this.getRefreshHideBlockXPathAction(), false);
	this.search_block_xpath.addEventListener ('keyup',this.getRefreshSearchBlockXPathAction(), false);
	this.hide_block_xpath.addEventListener ('change',this.getRefreshHideBlockXPathAction(), false);
	this.search_block_xpath.addEventListener ('change',this.getRefreshSearchBlockXPathAction(), false);
	this.hide_block_css.addEventListener ('keyup',this.getRefreshHideBlockXPathAction(), false);
	this.search_block_css.addEventListener ('keyup',this.getRefreshSearchBlockXPathAction(), false);
	this.hide_block_css.addEventListener ('change',this.getRefreshHideBlockXPathAction(), false);
	this.search_block_css.addEventListener ('change',this.getRefreshSearchBlockXPathAction(), false);
	
	document.getElementById('rule_editor_test_button').addEventListener('click', function () 
	{
		window.ruleEditor.applyInput();
		for (var i=0, l=hiddenNodes.length; i<l; i++)
		{
			hiddenNodes[i].style.display = 'block';
		}
		if (RuleExecutor.styleTag)
		{
			RuleExecutor.styleTag.parentNode.removeChild(RuleExecutor.styleTag);
		}
		RuleExecutor.applyRule(rule, true,
			function (node) 
			{
				addToHiddenNodes(node);
				node.style.backgroundColor = '#ccc';
			}, true
		);	
	}, false);
	document.getElementById('rule_editor_site_regexp').addEventListener ('keyup',function()
	{
		var regex;
		if (document.getElementById('specify_url_by_regexp_checkbox').checked) {
			// Use RegExp
			regex = new RegExp(document.getElementById('rule_editor_site_regexp').value);
		} else {
			regex = new RegExp(CustomBlockerUtil.wildcardToRegExp(document.getElementById('rule_editor_site_regexp').value));
			
		}
		var matched = regex.test(location.href);
		document.getElementById('rule_editor_alert_site_regexp').style.display = (matched)?'none':'block';
	},
	false);
	var helpLinks = CustomBlockerUtil.getElementsByXPath('id("rule_editor_body")//a[@class="help"]');
	for (var i=0, l=helpLinks.length; i<l; i++) 
	{
		var link = helpLinks[i];
		link.addEventListener('click',CustomBlockerUtil.getShowHelpAction(link.href),false);
		link.href = 'javascript:void(0)';
	}
	console.log("Action added to checkbox.");
	document.getElementById('rule_editor_keyword_regexp_checkbox').addEventListener('click',RuleEditorDialog.changeKeywordColor, false);
	RuleEditorDialog.changeKeywordColor(null);
	this.rule.changed = false;
	this.title.addEventListener('change', this.getChangedAction(), false);
	this.site_regexp.addEventListener('change', this.getChangedAction(), false);
	this.example_url.addEventListener('change', this.getChangedAction(), false);
	this.site_description.addEventListener('change', this.getChangedAction(), false);
	this.search_block_xpath.addEventListener('change', this.getChangedAction(), false);
	this.search_block_css.addEventListener('change', this.getChangedAction(), false);
	this.radio_search_css.addEventListener('change', this.getChangedAction(), false);
	this.radio_search_xpath.addEventListener('change', this.getChangedAction(), false);
	this.search_block_description.addEventListener('change', this.getChangedAction(), false);
	this.hide_block_xpath.addEventListener('change', this.getChangedAction(), false);
	this.hide_block_css.addEventListener('change', this.getChangedAction(), false);
	this.radio_hide_css.addEventListener('change', this.getChangedAction(), false);
	this.radio_hide_xpath.addEventListener('change', this.getChangedAction(), false);
	this.hide_block_description.addEventListener('change', this.getChangedAction(), false);
	this.block_anyway.addEventListener('change', this.getChangedAction(), false);
	this.block_anyway_false.addEventListener('change', this.getChangedAction(), false);
	this.specify_url_by_regexp_checkbox.addEventListener('change', this.getChangedAction(), false);
};
RuleEditorDialog.prototype.hideCover = function ()
{
	window.elementHighlighter.highlightHideElements (null);
};
RuleEditorDialog.prototype.getChangedAction = function ()
{
	var self = this;
	return function (sender)
	{
		console.log("change block_anyway=" + self.block_anyway.checked);
		self.setBlockAnywayStyle(self.block_anyway.checked);
		self.rule.changed = true;
	}
};
RuleEditorDialog.prototype.setBlockAnywayStyle = function (on)
{
	this.hide_detail.style.display = (on)?'none':'block';
	/*
	document.getElementById('rule_editor_keyword_section_wrapper').className 
		= (on)?'block_anyway':'';
	document.getElementById('rule_editor_search_section_wrapper').className 
		= (on)?'block_anyway':'';
	*/
};
RuleEditorDialog.changeKeywordColor = function (sender)
{
	document.getElementById('rule_editor_keyword').style.backgroundColor =
		(document.getElementById('rule_editor_keyword_regexp_checkbox').checked)?'#fdd':'#def';
}
RuleEditorDialog.prototype.getRefreshPathSecionsAction = function ()
{
	var self = this;
	return function (event)
	{
		self.refreshPathSections();
		self.refreshXPathSelectedStyles();
	}
};

RuleEditorDialog.prototype.getRefreshHideBlockXPathAction = function ()
{
	var self = this;
	return function (event)
	{
		self.refreshXPathSelectedStyles();
		
	}
};
RuleEditorDialog.prototype.getRefreshSearchBlockXPathAction = function ()
{
	var self = this;
	return function (event)
	{
		self.refreshXPathSelectedStyles();
	}
};
RuleEditorDialog.prototype.refreshPathSections = function ()
{
	var hideByXPath = document.getElementById('rule_editor_radio_hide_xpath').checked;
	var searchByXPath = document.getElementById('rule_editor_radio_search_xpath').checked;
	document.getElementById('rule_editor_section_hide_xpath').style.display = (hideByXPath)?'block':'none';
	document.getElementById('rule_editor_section_hide_css').style.display = (hideByXPath)?'none':'block';
	document.getElementById('rule_editor_section_search_xpath').style.display = (searchByXPath)?'block':'none';
	document.getElementById('rule_editor_section_search_css').style.display = (searchByXPath)?'none':'block';
};
RuleEditorDialog.prototype.refreshXPathSelectedStyles = function ()
{
	var searchAlertElement = document.getElementById('rule_editor_alert_search_block_xpath');
	var hideAlertElement = document.getElementById('rule_editor_alert_hide_block_xpath');
	
	var searchXpathCountElement = document.getElementById('rule_editor_count_search_block_xpath');
	var searchCssCountElement = document.getElementById('rule_editor_count_search_block_css');
	var hideXpathCountElement = document.getElementById('rule_editor_count_hide_block_xpath');
	var hideCssCountElement = document.getElementById('rule_editor_count_hide_block_css');
	// Hide
	if (document.getElementById('rule_editor_radio_hide_xpath').checked)
	{
		this.validatePath (document.getElementById('rule_editor_hide_block_xpath'), 
			false, false,
			hideXpathCountElement,
			hideAlertElement);
	}
	else
	{
		this.validatePath (document.getElementById('rule_editor_hide_block_css'), 
			true, false,
			hideCssCountElement,
			hideAlertElement);
	}
	// Search
	if (document.getElementById('rule_editor_radio_search_xpath').checked)
	{
		this.validatePath (document.getElementById('rule_editor_search_block_xpath'), 
			false, true,
			searchXpathCountElement,
			searchAlertElement);
	}
	else
	{
		this.validatePath (document.getElementById('rule_editor_search_block_css'), 
			true, true,
			searchCssCountElement,
			searchAlertElement);
	}
};
RuleEditorDialog.prototype.validatePath = function (input, useCss, search, countElement, alertElement)
{
	var pathNodes;
	try {
		var pathNodes;
		if (useCss) pathNodes = (input.value!='')?CustomBlockerUtil.getElementsByCssSelector(input.value):[];
		else pathNodes = (input.value!='')?CustomBlockerUtil.getElementsByXPath(input.value):[];
		countElement.innerHTML = pathNodes.length;
		alertElement.style.display = 'none';
		if (search)
			window.elementHighlighter.highlightSearchElements (pathNodes);
		else
			window.elementHighlighter.highlightHideElements (pathNodes);
	}
	catch (e)
	{
		console.log(e)
		//Invalid XPath or CSS Selector
		alertElement.style.display = 'block';
		alertElement.innerHTML = 'Invalid ' + ((useCss)?'CSS Selector':'XPath');
		countElement.innerHTML = '-';
	}
};
RuleEditorDialog.prototype.showMessage = function (message)
{
	var div = document.getElementById('rule_editor_alert');
	div.style.display = 'block';
	div.innerHTML = message;
};
RuleEditorDialog.prototype.getCloseAction = function ()
{
	var self = this;
	return function (event)
	{
		if (self.rule.changed)
		{
			if (!window.confirm(chrome.i18n.getMessage('unsavedDialog')))
				return;
		}
		window.elementHighlighter.highlightRule(null);
		self.div.parentNode.removeChild(self.div);
		CustomBlockerUtil.removeCss('/css/rule_editor_cursor.css');
		RuleExecutor.reloadRules();
		window.ruleEditor = null;
	}
	
};
RuleEditorDialog.prototype.getOnMousedownAction = function () 
{
	var self = this;
	return function (event) 
	{
		self.moving = true;
		self.origEventX = event.pageX;
		self.origEventY = event.pageY;
		self.origDivX = parseInt(self.div.style.right.replace('px',''));
		self.origDivY = parseInt(self.div.style.top.replace('px',''));
	}
};
RuleEditorDialog.prototype.getOnMousemoveAction = function ()
 {
	var self = this;
	return function (event) 
	{
		if (!self.moving) return;
		self.div.style.position = 'absolute';
		self.div.style.right = (self.origDivX-(event.pageX - self.origEventX)) + 'px';
		self.div.style.top = (self.origDivY+(event.pageY - self.origEventY)) + 'px';
		
	}
};
RuleEditorDialog.prototype.getOnMouseupAction = function () 
{
	var self = this;
	return function (event) 
	{
		if (self.moving)
			self.moving = false;
		else
		{
			self.processSelection(event);
		}
	}
};
/**
 * Add selected text to 'keyword' textbox
 */
RuleEditorDialog.prototype.processSelection = function (event)
{
	if (null==document.getSelection()) 
		return;
	if (document.getElementById('rule_editor_keyword') == event.srcElement)
		return;
	//document.getElementById('rule_editor_keyword').value = document.getSelection().toString();
};
/**
 * PathPickerDialog
 */
var PathPickerDialog = function (_zIndex, ruleEditor) 
{
	this.ruleEditor = ruleEditor;
	this.div = document.createElement('DIV');
	this.div.id = 'xpath_picker_body';
	this.div.avoidStyle = true;
	with (this.div.style) 
	{
		display = 'none';
		backgroundColor = 'white';
		zIndex = _zIndex;
		fontSize = 'small';
		textAlign = 'left';
		position = 'absolute';
		padding = '4px';
		color = 'black';
	}
	this.ul = document.createElement('UL');
	this.ul.avoidStyle = true;
	this.div.appendChild(this.ul);
	document.body.appendChild(this.div);
	this.currentSearchFilter = null;
	this.currentHideFilter = null;
	this.currentFilter = null;
};

PathPickerDialog.prototype.show = function (event, list, /* PathPickerDialog.target... */target) 
{
	this.ul.innerHTML = '';
	
	for (var i=0, l=list.length; i<l; i++) 
	{
		var li = document.createElement('LI');
		li.avoidStyle = true;
		var a = document.createElement('A');
		a.avoidStyle = true;
		a.href = 'javascript:void(0)';
		var span = document.createElement('SPAN');
		span.className = 'xpath';
		span.innerHTML = CustomBlockerUtil.escapeHTML(CustomBlockerUtil.trim(list[i].path)); 
		var badge = document.createElement('SPAN');
		badge.className = 'badge';

		badge.innerHTML = list[i].elements.length;
		
		a.appendChild(badge);
		a.appendChild(span);
		
		a.addEventListener('click', this.getOnclickAction(list[i], target), false);
		a.addEventListener('mouseover', this.getOnmouseoverAction(list[i], target), false);
		li.appendChild(a);
		this.ul.appendChild(li);
	}
	
	this.div.style.display = 'block';
	
	var _left = event.clientX + document.body.scrollLeft;
	var _top = event.clientY + document.body.scrollTop;
	
	if (_left + this.div.clientWidth > document.body.scrollLeft + window.innerWidth)
	{
		_left = document.body.scrollLeft + window.innerWidth - this.div.cliehtWidth;
	}
	
	if (_top + this.div.clientHeight > document.body.scrollTop + window.innerHeight) 
	{
		_top = document.body.scrollTop + window.innerHeight - this.div.clientHeight;
	}
	
	this.div.style.left = _left + 'px';
	this.div.style.top = _top + 'px';

	var currentFilter = (target.isToHide)?self.currentHideFilter:self.currentSearchFilter;
	if (this.currentFilter!=currentFilter) 
	{
		var elements = this.currentFilter.elements;
		for (var i=0, l=elements.length; i<l; i++) 
		{
			if (elements[i].tmpUnselect)
				elements[i].tmpUnselect();
		}
	}
};
PathPickerDialog.prototype.getOnmouseoverAction = function (filter, /*PathPickerDialog.target...*/target) 
{
	var self = this;
	return function()
	{
		var currentFilter = (target.isToHide)?self.currentHideFilter:self.currentSearchFilter;
		
		if (currentFilter) 
		{
			var elements = currentFilter.elements;
			for (var i=0, l=elements.length; i<l; i++) 
			{
				if (!elements[i].avoidStyle)
				elements[i].style.outline = '';
			}
		}
		try 
		{
			var pathNodes = target.getPathNodes(filter.path);
			for (var i = 0; i < pathNodes.length; i++) 
			{
				if (pathNodes[i] != selectedNode && !pathNodes[i].avoidStyle && pathNodes[i].tmpSelectForHide) 
				{
					if (target.isToHide) pathNodes[i].tmpSelectForHide();
					else  pathNodes[i].tmpSelectForSearch();
				}
			}
		} 
		catch (e) 
		{
			console.log(e)
		}
		if (target.isToHide) self.currentHideFilter = filter;
		else self.currentSearchFilter = filter;
		self.currentFilter = filter;
	}
}
PathPickerDialog.prototype.getOnclickAction = function (filter, /*PathPickerDialog.target...*/target) 
{
	var self = this;
	return function()
	{
		var currentFilter = (target.isToHide)?self.currentHideFilter:self.currentHideFilter;
		
		document.getElementById(target.textboxId).value = CustomBlockerUtil.trim(filter.path);
		self.ruleEditor.ruleEditorDialog.refreshXPathSelectedStyles();
		
		if (target.isToHide) self.currentHideFilter = filter;
		else self.currentSearchFilter = filter;
		
		self.currentFilter = filter;
		self.div.style.display = 'none';
	}
}


var RuleElement = 
{
	
};

RuleElement.appendFunctions = function (element)
{
	element.isFocusedForHide = false;
	element.isFocusedForSearch = false;
	element.isTmpSelectedForHide = false;
	element.isTmpSelectedForSearch = false;
	element.isFocusedForHide = false;
	element.isSelectedForHide = false;
	element.isSelectedForSearch = false;
	
	// mouseover & out
	element.focusForHide = RuleElement.getFocusForHideFunc(element);
	element.focusForSearch = RuleElement.getFocusForSearchFunc(element);
	element.unfocus = RuleElement.getUnfocusFunc(element);
	// select by XPath Picker
	element.tmpSelectForHide = RuleElement.getTmpSelectForHideFunc(element);
	element.tmpSelectForSearch = RuleElement.getTmpSelectForSearchFunc(element);
	element.tmpUnselect = RuleElement.getTmpUnselectFunc(element);
};

RuleElement.getFocusForHideFunc = function (element) 
{
	return function()
	{
		// Save
		element.isFocusedForHide = true;
		element.style.outline = ElementHighlighter.STYLE_FOCUS_FOR_HIDE;
	};
};
RuleElement.getFocusForSearchFunc = function (element) 
{
	return function()
	{
		// Save
		if (null==element.originalStyle)
			element.originalStyle = (null!=element.style.outline)?element.style.outline:"";
		element.isFocusedForHide = true;
		element.style.outline = ElementHighlighter.STYLE_FOCUS_FOR_SEARCH;
	};
};
RuleElement.getUnfocusFunc = function (element) 
{
	return function()
	{
		element.isFocusedForHide = false;
		if (element.isSelectedForHide) 
			element.style.outline = ElementHighlighter.STYLE_SELECT_FOR_HIDE;
		else if (element.isSelectedForSearch) 
			element.style.outline = ElementHighlighter.STYLE_SELECT_FOR_SEARCH;
		selectedNode.style.outline = element.originalStyle;
	};
};

RuleElement.getTmpSelectForHideFunc = function (element) 
{
	return function()
	{
		if (null==element.originalStyle)
			element.originalStyle = (null!=element.style.outline)?element.style.outline:"";
		element.isTmpSelectedForHide = true;
		element.style.outline = ElementHighlighter.STYLE_TMP_SELECT_FOR_HIDE;
	};
};

RuleElement.getTmpSelectForSearchFunc = function (element) 
{
	return function()
	{
		if (null==element.originalStyle)
			element.originalStyle = (null!=element.style.outline)?element.style.outline:"";
		element.isTmpSelectedForSearch = true;
		element.style.outline = ElementHighlighter.STYLE_TMP_SELECT_FOR_SEARCH;
	};
}
RuleElement.getTmpUnselectFunc = function (element) 
{
	return function()
	{
		element.isTmpSelectedForHide = false;
		element.isTmpSelectedForSearch = false;
		if (element.isSelectedForHide) 
			element.style.outline = ElementHighlighter.STYLE_SELECT_FOR_HIDE;
		else if (element.isSelectedForSearch) 
			element.style.outline = ElementHighlighter.STYLE_SELECT_FOR_SEARCH;
		element.style.outline = element.originalStyle;
	};
};

PathPickerDialog.targetNone = {
		none: true,
		isToHide: false,
		isToSearch: false,
		textboxId: 'rule_editor_hide_block_xpath'
};
PathPickerDialog.targetHideXpath = {
		none: false,
		isToHide: true,
		isToSearch: false,
		textboxId: 'rule_editor_hide_block_xpath',
		getPathBuilder: function () { return new XpathBuilder(); },
		getPathNodes: function (path) { return CustomBlockerUtil.getElementsByXPath(path); }
};
PathPickerDialog.targetHideCss = {
		none: false,
		isToHide: true,
		isToSearch: false,
		textboxId: 'rule_editor_hide_block_css',
		getPathBuilder: function () { return new CssBuilder(); },
		getPathNodes: function (path) { return CustomBlockerUtil.getElementsByCssSelector(path); }
};
PathPickerDialog.targetSearchXpath = {
		none: false,
		isToHide: false,
		isToSearch: true,
		textboxId: 'rule_editor_search_block_xpath',
		getPathBuilder: function () { return new XpathBuilder(); },
		getPathNodes: function (path) { return CustomBlockerUtil.getElementsByXPath(path); }
};
PathPickerDialog.targetSearchCss = {
		none: false,
		isToHide: false,
		isToSearch: true,
		textboxId: 'rule_editor_search_block_css',
		getPathBuilder: function () { return new CssBuilder(); },
		getPathNodes: function (path) { return CustomBlockerUtil.getElementsByCssSelector(path); }
};