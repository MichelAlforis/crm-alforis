#!/usr/bin/env python3
"""
Compile CNMV SGIIC company data from collected information
"""
import json
import re

# Complete list of registration numbers from earlier WebFetch
REG_NUMBERS = [1, 2, 9, 12, 14, 15, 21, 29, 31, 34, 36, 37, 40, 43, 45, 46, 49, 55, 57, 58, 60, 69, 78, 84, 95, 98, 103, 105, 113, 121, 126, 131, 132, 133, 137, 139, 140, 142, 152, 154, 161, 173, 185, 190, 193, 194, 195, 200, 206, 207, 209, 210, 215, 219, 220, 221, 223, 224, 225, 226, 227, 229, 230, 232, 234, 236, 237, 238, 239, 240, 241, 242, 246, 247, 248, 250, 251, 252, 253, 254, 256, 257, 260, 261, 263, 264, 265, 266, 267, 268, 269, 270, 271, 273, 274, 275, 277, 278, 279, 280, 281, 282, 283, 284, 285, 286, 287, 288, 289, 290, 291, 292, 293, 294, 295, 296]

# Data collected from WebFetch calls - manually compiled
COMPANIES_DATA = [
    # Batch 1 (1-25)
    {"register_number": "1", "name": "URQUIJO GESTION, S.A., S.G.I.I.C., SOCIEDAD UNIPERSONAL", "register_date": "12/11/1985", "address": "SERRANO, 71, 1ª - 28006 MADRID"},
    {"register_number": "2", "name": "MEDIOLANUM GESTION, S.G.I.I.C., S.A.", "register_date": "12/11/1985", "address": "C/ AGUSTINA SARAGOSSA, 3-5 BAJOS - 08017 BARCELONA"},
    {"register_number": "9", "name": "GESNORTE, S.A., S.G.I.I.C.", "register_date": "12/11/1985", "address": "Plaza de las Cortes, número 2, 4ª planta - 28014 MADRID"},
    {"register_number": "12", "name": "SANTANDER ASSET MANAGEMENT, S.A., SGIIC", "register_date": "12/11/1985", "address": "Paseo de la Castellana, 24 - 28046 Madrid"},
    {"register_number": "14", "name": "BBVA ASSET MANAGEMENT, S.A., SGIIC", "register_date": "12/11/1985", "address": "Calle Azul, 4 - 28050 MADRID"},
    {"register_number": "15", "name": "CAIXABANK ASSET MANAGEMENT SGIIC, S.A.", "register_date": "12/11/1985", "address": "PASEO CASTELLANA, 189 - 28046 MADRID"},
    {"register_number": "21", "name": "MUTUACTIVOS, S.A., S.G.I.I.C.", "register_date": "12/11/1985", "address": "PASEO CASTELLANA 33 - 28046 MADRID"},
    {"register_number": "29", "name": "GVC GAESCO GESTIÓN, SGIIC, S.A.", "register_date": "09/12/1985", "address": "C./ DOCTOR FERRAN, Nº 3-5, 1ª - 43001 TARRAGONA"},

    # Need to fetch more from website
    # Batch 2 (26-97)
    {"register_number": "98", "name": "DUNAS CAPITAL ASSET MANAGEMENT S.G.I.I.C., S.A.", "register_date": "16/01/1989", "address": "FERNANFLOR, 4, 4ª PLANTA - 28014 MADRID"},
    {"register_number": "103", "name": "BESTINVER GESTION, S.A., S.G.I.I.C.", "register_date": "26/01/1989", "address": "JUAN DE MENA, 8, 1º DCHA. - 28014 MADRID"},
    {"register_number": "105", "name": "INVERSIS GESTIÓN, S.A., SGIIC", "register_date": "26/01/1989", "address": "AVENIDA DE LA HISPANIDAD, 6 - 28042 MADRID"},
    {"register_number": "113", "name": "TREA ASSET MANAGEMENT S.G.I.I.C., S.A.", "register_date": "31/05/1989", "address": "ORTEGA Y GASSET, 20 - 28006 MADRID"},
    {"register_number": "121", "name": "MAPFRE ASSET MANAGEMENT, SGIIC, S.A.", "register_date": "16/11/1989", "address": "CARRETERA POZUELO Nº 50-1 PLANTA 2. MODULO NORTE - 28222 MAJADAHONDA"},
    {"register_number": "126", "name": "CBNK GESTION DE ACTIVOS, S.G.I.I.C., S.A.", "register_date": "15/03/1990", "address": "ALMAGRO 8, PLANTA 5ª - 28010 MADRID"},
    {"register_number": "131", "name": "RIVA Y GARCIA GESTION, S.G.I.I.C., S.A.", "register_date": "06/07/1990", "address": "PELAI 56, 3º 4ª - 08001 BARCELONA"},

    # Batch 3 (200-238)
    {"register_number": "200", "name": "FONDITEL GESTION, SGIIC, SA", "register_date": "20/05/2003", "address": "Ronda de la Comunicación s/n, Distrito Telefónica - 28050 Madrid"},
    {"register_number": "206", "name": "DUX INVERSORES, SGIIC, S.A.", "register_date": "24/09/2004", "address": "PLAZA DE LA INDEPENDENCIA, 6 - 28001 MADRID"},
    {"register_number": "207", "name": "WELZIA MANAGEMENT, SGIIC, S.A.", "register_date": "12/01/2005", "address": "CONDE DE ARANDA, 24 - 4ª PL - 28001 MADRID"},
    {"register_number": "209", "name": "PACTIO GESTION, SGIIC, S.A.", "register_date": "08/07/2005", "address": "RAFAEL CALVO, 39 - 28010 MADRID"},
    {"register_number": "210", "name": "ATL 12 CAPITAL GESTION S.G.I.I.C, S.A.", "register_date": "18/07/2005", "address": "MONTALBAN 9 - 28014 MADRID"},
    {"register_number": "215", "name": "ALTEX ASSET MANAGEMENT SGIIC, S.A.", "register_date": "22/01/2007", "address": "PASEO DE LA CASTELLANA 101 BAJO 2 - 28046 MADRID"},
    {"register_number": "219", "name": "ALTAN CAPITAL, SGIIC, S.A.", "register_date": "20/07/2007", "address": "Paseo de la Castellana, 91 - 28046 MADRID"},
    {"register_number": "220", "name": "OMEGA GESTION DE INVERSIONES, SGIIC, S.A.", "register_date": "31/08/2007", "address": "PS. DE LA CASTELLANA 28 - 28046 MADRID"},

    # Batch 4 (239-266)
    {"register_number": "239", "name": "MAGALLANES VALUE INVESTORS, S.A., SGIIC", "register_date": "05/12/2014", "address": "C/ LAGASCA, 88 - 28001 MADRID"},
    {"register_number": "240", "name": "ARCANO CAPITAL, SGIIC, S.A.", "register_date": "06/03/2015", "address": "C/ JOSÉ ORTEGA Y GASSET, 29 - 4ª - 28006 MADRID"},
    {"register_number": "241", "name": "PATRIVALOR, SGIIC, S.A.", "register_date": "04/05/2015", "address": "PASEO DE LA CASTELLANA, 12 - 2º D - 28046 MADRID"},
    {"register_number": "242", "name": "QUADRIGA ASSET MANAGERS, SGIIC, S.A.", "register_date": "12/06/2015", "address": "CUESTA DEL SAGRADO CORAZON, 6-8 - 28016 MADRID"},
    {"register_number": "246", "name": "ATTITUDE GESTION, SGIIC, S.A.", "register_date": "12/02/2016", "address": "CALLE ORENSE, 68 PLANTA 11 - 28020 MADRID"},
    {"register_number": "247", "name": "ALTAMAR PRIVATE EQUITY, S.G.I.I.C., S.A.", "register_date": "19/02/2016", "address": "Pº CASTELLANA, 91 - 28046 MADRID"},
    {"register_number": "248", "name": "SOLVENTIS S.G.I.I.C., S.A.", "register_date": "26/02/2016", "address": "PASEO CASTELLANA 60, 4ª PLANTA DERECHA - 28046 MADRID"},
    {"register_number": "250", "name": "VARIANZA GESTION, SGIIC, S.A.", "register_date": "16/09/2016", "address": "CALLE ZURBANO 23 1º IZQUIERDA - 28010 MADRID"},

    # Batch 5 (267-296)
    {"register_number": "267", "name": "NAO ASSET MANAGEMENT, E.S.G. SGIIC, S.A.", "register_date": "20/07/2018", "address": "Plaza del Ayuntamiento núm. 27, 7ª planta - 46002 Valencia"},
    {"register_number": "268", "name": "BEKA ASSET MANAGEMENT, SGIIC, S.A.", "register_date": "28/09/2018", "address": "Calle Serrano 88, planta 7ª - 28006 Madrid"},
    {"register_number": "269", "name": "MARKET PORTFOLIO ASSET MANAGEMENT, S.G.I.I.C., S.A.", "register_date": "19/10/2018", "address": "CALLE ALMAGRO, 26. ENTREPLANTA IZQUIERDA - 28010 MADRID"},
    {"register_number": "270", "name": "AUGUSTUS CAPITAL ASSET MANAGEMENT, SGIIC, S.A.", "register_date": "08/11/2018", "address": "PLAZA DE ARAGÓN, 10 - 10º - 50004 ZARAGOZA"},
    {"register_number": "271", "name": "SASSOLA PARTNERS, SGIIC, S.A.", "register_date": "01/03/2019", "address": "CALLE ALMAGRO Nº26, ESC IZQ, PLANTA 1ºB - 28010 MADRID"},
    {"register_number": "273", "name": "AMCHOR INVESTMENT STRATEGIES, SGIIC, S.A.", "register_date": "26/04/2019", "address": "CALLE VELÁZQUEZ, 166 - 28002 MADRID"},
    {"register_number": "274", "name": "AFI INVERSIONES GLOBALES, SGIIC, S.A.", "register_date": "19/07/2019", "address": "C/ MARQUES DE VILLAMEJOR 5 - 28006 MADRID"},
]

print(f"Currently have {len(COMPANIES_DATA)} companies")
print(f"Need total of {len(REG_NUMBERS)} companies")
print(f"Missing {len(REG_NUMBERS) - len(COMPANIES_DATA)} companies")

# Identify missing registration numbers
collected_nums = {int(c['register_number']) for c in COMPANIES_DATA}
missing_nums = [n for n in REG_NUMBERS if n not in collected_nums]
print(f"\nMissing registration numbers: {missing_nums}")
