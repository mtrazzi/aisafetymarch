// City → Signal group chat link, shown as "Join the <City> Signal chat" on the map list and popups.
// Add, change or remove a line here to update a city's link; cities without a line get no button.
// City names must match the site's spelling (accents don't matter: 'Montreal' matches 'Montréal').
// A city can also take { url, label } to borrow another chat, e.g. Miami → "Join the Florida Signal chat".
window.SIGNAL_CHATS = {
  'Atlanta':       'https://signal.group/#CjQKIFl2Lg_8QzcbRrgo3tTIN8Xq-X-OatPbJ3CUpBKK2wjlEhA5-w3yLrnK41o0FPcD9vdH',
  'Barcelona':     'https://signal.group/#CjQKIO4zsTaI5ll8dUPdsOpx5vRphIFth-EUto60hnqMzn8OEhAcCEYwH4810br3XBHl_UNe',
  'Berlin':        'https://signal.group/#CjQKIDclKIKifS_hNO1zcb5oj-FGEa9jvkdRgvMBnYNdAPXfEhBUqWUQDSl1GU0viSTOSVPq',
  'Chicago':       'https://signal.group/#CjQKIFaOeUlBMMxTKfPLD311CZJ8Rur_u7sT5OoL8EvJbXJgEhAgiK7CF2br_ciE8CaTYKpl',
  'Cleveland':     'https://signal.group/#CjQKIM-gwtwzd4jRMUNkgiI02A2tPB1jYgCEfnKgFsyJOO_-EhDxlx-rw4Sf1DEzUm9W6dG9',
  'Denver':        'https://signal.group/#CjQKIOyqyMtbtL9XQ1lAh-9thSsgXdifqbaCgaNk8Yfk1Y6VEhD2TIcoyXC-S3__A8vw0FiE',
  'Detroit':       'https://signal.group/#CjQKIGE0hnvomDeQFnc1iUrwok_YcpROQpd8rBykShByHQD7EhC_CJ5I1DbQR5tiTFfepO56',
  'Raleigh-Durham': 'https://signal.group/#CjQKIFRbabFiT-RncgckqrAC9-Ru_nt_SDq_NUCB_b2d9r42EhDTZY6fccqnTsDekKUzh8Ju',
  'Florianópolis': 'https://signal.group/#CjQKIP9mhx8P4N8uDAY6Zkhvu-whQdtRTKwq8hQNeITfPckFEhAoPqliSX2KunKTfFbdVLwj',
  'London':        'https://signal.group/#CjQKIE_Y2R91r7wEvOExKPH0ZY-JWGKrZy2COH1YOVaODs8lEhBPgeQ1199mRp31JY7E_3XT',
  'Los Angeles':   'https://signal.group/#CjQKIJn8jXVr8ZTghWdamTZgMwAu4rTDxgpYjOZ-A1Kop2Z9EhC3rmrzm6jvpp2LTVP7FKvI',
  'Madison':       'https://signal.group/#CjQKIO5lfB-FX65nmyuvHNjwnLgoCanU4jmB0uZIPS4qVC6FEhB85m__BEEUgNTQDY0mH-6m',
  'Miami':         { url: 'https://signal.group/#CjQKIF7svdXxPsnF6QU9PEZfRHpYr37wrIGmA2nRi-mXfoIDEhDZhelF0dOy-xqNzC0Yj7R6', label: 'Florida' },
  'Nashville':     'https://signal.group/#CjQKIOOkP5UCCf08pRRuGhfzHUqBp6TH4UaMJcd17byeRaNfEhCEk3HjPQYSdgjEaYliWV1N',
  'Orlando':       'https://signal.group/#CjQKIF7svdXxPsnF6QU9PEZfRHpYr37wrIGmA2nRi-mXfoIDEhDZhelF0dOy-xqNzC0Yj7R6',
  'Oslo':          'https://signal.group/#CjQKIIST7SfpkcoX9aglcl4XlDTXJP2tY-4oFUpTm5ml6FK8EhC5U8772vnyo6tbrLyEW2XK',
  'Philadelphia':  'https://signal.group/#CjQKIJc5oVsI1IZo_gyD6bwVHeayPJxexHPuxDCmEBJhVIPmEhANql9GuoLFZjpV6Vl6W6DW',
  'Seattle':       'https://signal.group/#CjQKIGk7Sn7fznz6S01ivzecBycaRK4T5zrEIEwl7GBXGeAnEhCxvlhnU1jWgBkTKdn3A8r4',
  'Vancouver':     'https://signal.group/#CjQKIGCvanTPlryiOLGZc9CuhPwST3VpAT2qNT_140Y4szXDEhCnthvfIxUOL5Wo6xOIlN-S',
  'Wichita':       'https://signal.group/#CjQKIJwmOTYFQHpEZozx087y7vNCQgOPrSyGJalq7zLdJWjcEhAgAl83EHZd_wpLbbXK8-13',
};
