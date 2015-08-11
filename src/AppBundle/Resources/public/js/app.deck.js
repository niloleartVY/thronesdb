(function app_deck(deck, $) {

deck.json = {};

var date_creation,
	date_update,
	description_md,
	history,
	id,
	name,
	slots,
	tags,
	faction_code,
	faction_name,
	unsaved,
	user_id,
	header_tpl = _.template('<h5><%= name %> (<%= quantity %>)</h5>'),
	card_line_tpl = _.template('<div><%= card.indeck %>x <a href="<%= card.url %>" class="card card-tip" data-toggle="modal" data-remote="false" data-target="#cardModal" data-code="<%= card.code %>"><%= card.name %></a></div>');

/**
 * @memberOf deck
 */
deck.init = function init(json) {
	if(json) deck.json = json;
	date_creation = deck.json.date_creation;
	date_update = deck.json.date_update;
	description_md = deck.json.description_md;
	history = deck.json.history;
	id = deck.json.id;
	name = deck.json.name;
	slots = deck.json.slots;
	tags = deck.json.tags;
	faction_code = deck.json.faction_code;
	faction_name = deck.json.faction_name;
	unsaved = deck.json.unsaved;
	user_id = deck.json.user_id;

	app.data.cards.update({}, {
		indeck: 0
	});
	for(code in slots) {
		if(slots.hasOwnProperty(code)) {
			app.data.cards.updateById(code, {indeck: slots[code]});
		}
	}
}

/**
 * @memberOf deck
 * @returns string
 */
deck.get_id = function get_id() {
	return id;
}

/**
 * @memberOf deck
 * @returns string
 */
deck.get_faction_code = function get_faction_code() {
	return faction_code;
}

/**
 * @memberOf deck
 * @returns string
 */
deck.get_description_md = function get_description_md() {
	return description_md;
}

/**
 * @memberOf deck
 */
deck.get_agendas = function get_agendas() {
	return deck.get_cards(null, {
		type_code: 'agenda'
	});
}

/**
 * @memberOf deck
 */
deck.get_agenda = function get_agenda() {
	var agendas = deck.get_agendas();
	return agendas.length ? agendas[0] : null;
}

/**
 * @memberOf deck
 */
deck.get_history = function get_history() {
	return history;
}

/**
 * @memberOf deck
 */
deck.get_cards = function get_cards(sort, query) {
	sort = sort || {};
	sort['code'] = 1;

	query = query || {};
	query.indeck = {
		'$gt': 0
	};

	return app.data.cards.find(query, {
		'$orderBy': sort
	});
}

/**
 * @memberOf deck
 */
deck.get_draw_deck = function get_draw_deck(sort) {
	return deck.get_cards(sort, {
		type_code: {
			'$nin' : ['agenda','plot']
		}
	});
}

/**
 * @memberOf deck
 */
deck.get_draw_deck_size = function get_draw_deck_size(sort) {
	var draw_deck = deck.get_draw_deck();
	var quantities = _.pluck(draw_deck, 'indeck');
	return _.reduce(quantities, function(memo, num) { return memo + num; }, 0);
}

/**
 * @memberOf deck
 */
deck.get_plot_deck = function get_plot_deck(sort) {
	return deck.get_cards(sort, {
		type_code: 'plot'
	});
}

/**
 * @memberOf deck
 * @returns the number of plot cards
 */
deck.get_plot_deck_size = function get_plot_deck_size(sort) {
	var plot_deck = deck.get_plot_deck();
	var quantities = _.pluck(plot_deck, 'indeck');
	return _.reduce(quantities, function(memo, num) { return memo + num; }, 0);
}

/**
 * @memberOf deck
 * @returns the number of different plot cards
 */
deck.get_plot_deck_variety = function get_plot_deck_variety(sort) {
	var plot_deck = deck.get_plot_deck();
	return plot_deck.length;
}

/**
 * @memberOf deck
 */
deck.get_included_packs = function get_included_packs() {
	var cards = deck.get_cards();
	var pack_codes = _.uniq(_.pluck(cards, 'pack_code'));
	var packs = app.data.packs.find({
		'code': {
			'$in': pack_codes
		}
	}, {
		'$orderBy': {
			'available': 1
		}
	});
	return packs;
}

/**
 * @memberOf deck
 */
deck.display = function display(container, sort, nb_columns) {
	var deck_content = $('<div class="deck-content">');

	/* to sort cards, we need:
	 * name of the key to sort upon
	 * label to display for each key
	 * order of the values
	 */
	var sortKey = '', displayLabel = '', valuesOrder = [];
	switch(sort) {
	case 'type':
		sortKey = 'type_code';
		displayLabel = 'type_name';
		valuesOrder = ['agenda','plot','character','attachment','location','event'];
		break;
	}

	valuesOrder.forEach(function (sortValue) {
		var query = {
			indeck: {
				'$gt': 0
			}
		};
		query[sortKey] = sortValue;
		var cards = app.data.cards.find(query, {
			'$orderBy': { name: 1 }
		});
		if(!cards.length) return;

		$(header_tpl({name:cards[0][displayLabel], quantity: cards.length})).appendTo(deck_content);
		cards.forEach(function (card) {
			$(card_line_tpl({card:card})).addClass(deck.can_include_card(card) ? '' : 'invalid-card').appendTo(deck_content);
		})
	})

	var deck_intro = $('<div class="deck-intro"><div class="media"><div class="media-left"></div><div class="media-body"></div></div>');
	$(deck_intro).find('.media-left').append('<span class="icon-'+deck.get_faction_code()+' '+deck.get_faction_code()+'"></span>');

	var deck_intro_body = $(deck_intro).find('.media-body');
	deck_intro_body.append('<h4>'+faction_name+'</h4>');
	deck_intro_body.append('<div>Draw deck: '+deck.get_draw_deck_size()+' cards.</div>');
	deck_intro_body.append('<div>Plot deck: '+deck.get_plot_deck_size()+' cards.</div>');
	deck_intro_body.append('<div>Included packs: ' + _.pluck(deck.get_included_packs(), 'name').join(', ') + '.</div>');

	var problem = deck.get_problem();
	if(problem) {
		deck_intro_body.append('<div class="text-danger">Problem: ' + problem + '.</div>');
	}

	$(container)
		.removeClass('deck-loading')
		.empty()
		.append(deck_intro)
		.append(deck_content);

}

/**
 * @memberOf deck
 * @return boolean true if at least one other card quantity was updated
 */
deck.set_card_copies = function set_card_copies(card_code, nb_copies) {
	var card = app.data.cards.findById(card_code);
	if(!card) return false;

	var updated_other_card = false;

	// card-specific rules
	switch(card.type_code) {
		case 'agenda':
		app.data.cards.update({
			type_code: 'agenda'
		}, {
			indeck: 0
		});
		updated_other_card = true;
		break;
	}

	app.data.cards.updateById(card_code, {
		indeck: nb_copies
	});
	if(app.deck_history) app.deck_history.notify_change();

	return updated_other_card;
}

/**
 * @memberOf deck
 */
deck.get_content = function get_content() {
	var cards = deck.get_cards();
	var content = {};
	cards.forEach(function (card) {
		content[card.code] = card.indeck;
	});
	return content;
}

/**
 * @memberOf deck
 */
deck.get_json = function get_json() {
	return JSON.stringify(deck.get_content());
}

/**
 * @memberOf deck
 */
deck.get_export = function get_export(format) {

}


/**
 * @memberOf deck
 */
deck.get_problem = function get_problem() {
	// exactly 7 plots
	if(deck.get_plot_deck_size() > 7) {
		return 'too_many_plots';
	}
	if(deck.get_plot_deck_size() < 7) {
		return 'too_few_plots';
	}

	// at least 6 different plots
	if(deck.get_plot_deck_variety() < 6) {
		return 'too_many_different_plots';
	}

	// no more than 1 agenda
	if(deck.get_agendas().length > 1) {
		return 'too_many_agendas';
	}

	// at least 60 others cards
	if(deck.get_draw_deck_size() < 60) {
		return 'too_few_cards';
	}

	// no invalid card
	if(deck.get_invalid_cards().length > 0) {
		return 'invalid_cards';
	}

	// the condition(s) of the agenda must be fulfilled
	var agenda = deck.get_agenda();
	if(!agenda) return;
	switch(agenda.code) {
		case '01027':
		if(deck.get_cards(null, { faction_code: 'neutral' }).length > 15) {
			return 'agenda';
		}
		break;
		case '01198':
		case '01199':
		case '01200':
		case '01201':
		case '01202':
		case '01203':
		case '01204':
		case '01205':
		var minor_faction_code = deck.get_minor_faction_code();
		if(deck.get_cards(null, { faction_code: minor_faction_code }).length < 12) {
			return 'agenda';
		}
		break;
	}
}

/**
 * @memberOf deck
 * @returns
 */
deck.get_minor_faction_code = function get_minor_faction_code() {
	var agenda = deck.get_agenda();
	if(!agenda) return;

	// special case for the Core Set Banners
	var banners_core_set = {
		'01198': 'baratheon',
		'01199': 'greyjoy',
		'01200': 'lannister',
		'01201': 'martell',
		'01202': 'nightswatch',
		'01203': 'stark',
		'01204': 'targaryen',
		'01205': 'tyrell'
	};
	return banners_core_set[agenda.code];
}

deck.get_invalid_cards = function get_invalid_cards() {
	return _.filter(deck.get_cards(), function (card) {
		return ! deck.can_include_card(card);
	});
}

/**
 * returns true if the deck can include the card as parameter
 * @memberOf deck
 */
deck.can_include_card = function can_include_card(card) {
	// neutral card => yes
	if(card.faction_code === 'neutral') return true;

	// in-house card => yes
	if(card.faction_code === faction_code) return true;

	// out-of-house and loyal => no
	if(card.isLoyal) return false;

	// minor faction => yes
	var minor_faction_code = deck.get_minor_faction_code();
	if(minor_faction_code && minor_faction_code === card.faction_code) return true;

	// if none above => no
	return false;
}

})(app.deck = {}, jQuery);