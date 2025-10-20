#!/usr/bin/env python3
"""
Build final JSON file with all CNMV SGIIC companies
"""
import json
import re

def parse_address(full_address):
    """Parse address to extract street, city, postal code"""
    # Pattern: STREET - POSTAL_CODE CITY
    match = re.search(r'(.+?)\s*-\s*(\d{5})\s+(.+)', full_address)
    if match:
        street = match.group(1).strip()
        postal_code = match.group(2).strip()
        city = match.group(3).strip().upper()
        return street, city, postal_code
    else:
        # Fallback - try to find postal code anyway
        postal_match = re.search(r'(\d{5})', full_address)
        if postal_match:
            return full_address, "", postal_match.group(1)
        return full_address, "", ""

# Complete dataset from all WebFetch calls
companies_raw = [
    {"register_number": "1", "name": "URQUIJO GESTION, S.A., S.G.I.I.C., SOCIEDAD UNIPERSONAL", "register_date": "12/11/1985", "address": "SERRANO, 71, 1ª - 28006 MADRID"},
    {"register_number": "2", "name": "MEDIOLANUM GESTION, S.G.I.I.C., S.A.", "register_date": "12/11/1985", "address": "C/ AGUSTINA SARAGOSSA, 3-5 BAJOS - 08017 BARCELONA"},
    {"register_number": "9", "name": "GESNORTE, S.A., S.G.I.I.C.", "register_date": "12/11/1985", "address": "Plaza de las Cortes, número 2, 4ª planta - 28014 MADRID"},
    {"register_number": "12", "name": "SANTANDER ASSET MANAGEMENT, S.A., SGIIC", "register_date": "12/11/1985", "address": "Paseo de la Castellana, 24 - 28046 Madrid"},
    {"register_number": "14", "name": "BBVA ASSET MANAGEMENT, S.A., SGIIC", "register_date": "12/11/1985", "address": "Calle Azul, 4 - 28050 MADRID"},
    {"register_number": "15", "name": "CAIXABANK ASSET MANAGEMENT SGIIC, S.A.", "register_date": "12/11/1985", "address": "PASEO CASTELLANA, 189 - 28046 MADRID"},
    {"register_number": "21", "name": "MUTUACTIVOS, S.A., S.G.I.I.C.", "register_date": "12/11/1985", "address": "PASEO CASTELLANA 33 - 28046 MADRID"},
    {"register_number": "29", "name": "GVC GAESCO GESTIÓN, SGIIC, S.A.", "register_date": "09/12/1985", "address": "C./ DOCTOR FERRAN, Nº 3-5, 1ª - 43001 TARRAGONA"},
    {"register_number": "31", "name": "AMUNDI IBERIA, SGIIC, S.A.", "register_date": "21/01/1986", "address": "Pº DE LA CASTELLANA, 1 - 28046 MADRID"},
    {"register_number": "34", "name": "PRISMA GLOBAL ASSET MANAGEMENT, SGIIC, S.A.", "register_date": "20/03/1986", "address": "TELLEZ, 30, OFICINA 2-2 - 28007 MADRID"},
    {"register_number": "36", "name": "ARQUIGEST, S.A., S.G.I.I.C.", "register_date": "17/06/1986", "address": "CALLE BARQUILLO 6, PRIMERO IZQUIERDA - 28004 MADRID"},
    {"register_number": "37", "name": "GESIURIS ASSET MANAGEMENT, SGIIC, S.A.", "register_date": "20/06/1986", "address": "Rambla de Cataluña 38, 9ª Planta - 08007 Barcelona"},
    {"register_number": "40", "name": "METAGESTION, S.A., SGIIC", "register_date": "11/09/1986", "address": "Calle Orense, número 20, planta 1ª, oficina 13 - 28020 Madrid"},
    {"register_number": "43", "name": "RENTA 4 GESTORA, S.G.I.I.C., S.A.", "register_date": "13/10/1986", "address": "Pº DE LA HABANA, 74, 2º IZDA. - 28036 MADRID"},
    {"register_number": "45", "name": "GRUPO CATALANA OCCIDENTE GESTION DE ACTIVOS, S.A., SGIIC", "register_date": "22/10/1986", "address": "CALLE MÉNDEZ ÁLVARO, Nº31 - 28045 MADRID"},
    {"register_number": "46", "name": "MDEF GESTEFIN, S.A.U., SGIIC (SOCIEDAD UNIPERSONAL)", "register_date": "22/10/1986", "address": "SERRANO, 1, 3º DERECHA - 28001 MADRID"},
    {"register_number": "49", "name": "EDM GESTION, SOCIEDAD ANONIMA, S.G.I.I.C.", "register_date": "14/11/1986", "address": "PASEO DE LA CASTELLANA, 78 - 28046 MADRID"},
    {"register_number": "55", "name": "BANKINTER GESTION DE ACTIVOS, S.A., S.G.I.I.C.", "register_date": "12/12/1986", "address": "AVDA. DE BRUSELAS 12 - 28108 ALCOBENDAS"},
    {"register_number": "57", "name": "GESCONSULT, S.A., S.G.I.I.C.", "register_date": "12/02/1987", "address": "Calle Serrano, número 37 - 28001 MADRID"},
    {"register_number": "58", "name": "SABADELL ASSET MANAGEMENT, S.A., S.G.I.I.C.", "register_date": "20/01/1987", "address": "PASEO DE LA CASTELLANA, 1 - 28046 MADRID"},
    {"register_number": "60", "name": "SANTANDER PRIVATE BANKING GESTIÓN, S.A., S.G.I.I.C.", "register_date": "24/02/1987", "address": "C/ JUAN IGNACIO LUCA DE TENA, 9-11 - 28027 MADRID"},
    {"register_number": "69", "name": "INTERMONEY GESTION, S.G.I.I.C., S.A.", "register_date": "21/04/1987", "address": "C/ PRINCIPE DE VERGARA, 131, PLANTA 3ª - 28002 MADRID"},
    {"register_number": "78", "name": "WELCOME ASSET MANAGEMENT, SGIIC, S.A.", "register_date": "24/09/1987", "address": "PASEO DE LA CASTELLANA, 110, 4ª PLANTA - 28046 MADRID"},
    {"register_number": "84", "name": "IBERCAJA GESTION, SGIIC, S.A.", "register_date": "14/04/1988", "address": "Pº DE LA CONSTITUCION, 4 - 50008 ZARAGOZA"},
    {"register_number": "95", "name": "KUTXABANK GESTION, SGIIC, S.A.", "register_date": "28/10/1988", "address": "PLAZA DE EUSKADI, NUMERO 5, PLANTA 27 - 48009 BILBAO"},
    {"register_number": "98", "name": "DUNAS CAPITAL ASSET MANAGEMENT S.G.I.I.C., S.A.", "register_date": "16/01/1989", "address": "FERNANFLOR, 4, 4ª PLANTA - 28014 MADRID"},
    {"register_number": "103", "name": "BESTINVER GESTION, S.A., S.G.I.I.C.", "register_date": "26/01/1989", "address": "JUAN DE MENA, 8, 1º DCHA. - 28014 MADRID"},
    {"register_number": "105", "name": "INVERSIS GESTIÓN, S.A., SGIIC", "register_date": "26/01/1989", "address": "AVENIDA DE LA HISPANIDAD, 6 - 28042 MADRID"},
    {"register_number": "113", "name": "TREA ASSET MANAGEMENT S.G.I.I.C., S.A.", "register_date": "31/05/1989", "address": "ORTEGA Y GASSET, 20 - 28006 MADRID"},
    {"register_number": "121", "name": "MAPFRE ASSET MANAGEMENT, SGIIC, S.A.", "register_date": "16/11/1989", "address": "CARRETERA POZUELO Nº 50-1 PLANTA 2. MODULO NORTE - 28222 MAJADAHONDA"},
    {"register_number": "126", "name": "CBNK GESTION DE ACTIVOS, S.G.I.I.C., S.A.", "register_date": "15/03/1990", "address": "ALMAGRO 8, PLANTA 5ª - 28010 MADRID"},
    {"register_number": "128", "name": "ABANCA GESTION DE ACTIVOS, SGIIC, SA", "register_date": "11/06/1990", "address": "C/ SERRANO 45, 3ª PLANTA - 28001 MADRID"},
    {"register_number": "131", "name": "RIVA Y GARCIA GESTION, S.G.I.I.C., S.A.", "register_date": "06/07/1990", "address": "PELAI 56, 3º 4ª - 08001 BARCELONA"},
    {"register_number": "132", "name": "G.I.I.C. FINECO, S.A., S.G.I.I.C.", "register_date": "16/08/1990", "address": "Calle Ercilla, nº 24, 2º - 48011 BILBAO"},
    {"register_number": "133", "name": "GESBUSA, S.A., S.G.I.I.C.", "register_date": "06/09/1990", "address": "ALFONSO XII, 22 PISO BAJO DERECHA - 28014 MADRID"},
    {"register_number": "137", "name": "GESALCALA, S.A., S.G.I.I.C.", "register_date": "29/11/1990", "address": "ORTEGA Y GASSET, 7 - 28006 MADRID"},
    {"register_number": "139", "name": "GESPROFIT, S.A., S.G.I.I.C.", "register_date": "14/03/1991", "address": "SERRANO, 67 - 28006 MADRID"},
    {"register_number": "140", "name": "GESCOOPERATIVO, S.A., S.G.I.I.C.", "register_date": "04/04/1991", "address": "Paseo de Recoletos, nº 3, 3ª Planta - 28004 Madrid"},
    {"register_number": "142", "name": "DEUTSCHE WEALTH MANAGEMENT SGIIC, S.A.", "register_date": "06/06/1991", "address": "Pº DE LA CASTELLANA, 18 - 28046 MADRID"},
    {"register_number": "152", "name": "GESINTER, S.G.I.I.C., S.A.", "register_date": "20/03/1992", "address": "ANGLI, 58 - 08017 BARCELONA"},
    {"register_number": "154", "name": "UNICAJA ASSET MANAGEMENT, S.G.I.I.C., S.A.", "register_date": "21/05/1992", "address": "AVENIDA DE ANDALUCIA, 10-12 - 29007 MALAGA"},
    {"register_number": "161", "name": "CAJA LABORAL GESTION, S.G.I.I.C., S.A.", "register_date": "18/02/1993", "address": "Pº JOSE Mª ARIZMENDIARRIETA, 5, 1ª - 20500 MONDRAGON"},
    {"register_number": "173", "name": "UBS WEALTH MANAGEMENT, S.G.I.I.C., S.A.", "register_date": "30/04/1996", "address": "AYALA, 42, 5ª PLANTA-A - 28001 MADRID"},
    {"register_number": "185", "name": "SINGULAR ASSET MANAGEMENT, SGIIC, S.A.", "register_date": "12/01/1999", "address": "CALLE GOYA 11 - 28001 MADRID"},
    {"register_number": "190", "name": "MARCH ASSET MANAGEMENT, S.G.I.I.C., S.A.U.", "register_date": "25/09/2000", "address": "C/ CASTELLÓ, 74 - 28006 MADRID"},
    {"register_number": "193", "name": "CAJA INGENIEROS GESTION, S.G.I.I.C., S.A.", "register_date": "21/12/2001", "address": "RAMBLA CATALUNYA, 2-4 - 08007 BARCELONA"},
    {"register_number": "194", "name": "ABANTE ASESORES GESTION, SGIIC, S.A.", "register_date": "11/01/2002", "address": "PLAZA DE LA INDEPENDENCIA, 6 - 28001 MADRID"},
    {"register_number": "195", "name": "A&G FONDOS, SGIIC, SA", "register_date": "25/01/2002", "address": "PASEO DE LA CASTELLANA, 92 - 28046 MADRID"},
    {"register_number": "200", "name": "FONDITEL GESTION, SGIIC, SA", "register_date": "20/05/2003", "address": "Ronda de la Comunicación s/n, Distrito Telefónica - 28050 Madrid"},
    {"register_number": "206", "name": "DUX INVERSORES, SGIIC, S.A.", "register_date": "24/09/2004", "address": "PLAZA DE LA INDEPENDENCIA, 6 - 28001 MADRID"},
    {"register_number": "207", "name": "WELZIA MANAGEMENT, SGIIC, S.A.", "register_date": "12/01/2005", "address": "CONDE DE ARANDA, 24 - 4ª PL - 28001 MADRID"},
    {"register_number": "209", "name": "PACTIO GESTION, SGIIC, S.A.", "register_date": "08/07/2005", "address": "RAFAEL CALVO, 39 - 28010 MADRID"},
    {"register_number": "210", "name": "ATL 12 CAPITAL GESTION S.G.I.I.C, S.A.", "register_date": "18/07/2005", "address": "MONTALBAN 9 - 28014 MADRID"},
    {"register_number": "215", "name": "ALTEX ASSET MANAGEMENT SGIIC, S.A.", "register_date": "22/01/2007", "address": "PASEO DE LA CASTELLANA 101 BAJO 2 - 28046 MADRID"},
    {"register_number": "219", "name": "ALTAN CAPITAL, SGIIC, S.A.", "register_date": "20/07/2007", "address": "Paseo de la Castellana, 91 - 28046 MADRID"},
    {"register_number": "220", "name": "OMEGA GESTION DE INVERSIONES, SGIIC, S.A.", "register_date": "31/08/2007", "address": "PS. DE LA CASTELLANA 28 - 28046 MADRID"},
    {"register_number": "221", "name": "CARTESIO INVERSIONES, SGIIC, S.A.", "register_date": "21/09/2007", "address": "GLORIETA DE RUBÉN DARÍO 3, 5ª PLANTA - 28010 MADRID"},
    {"register_number": "223", "name": "TRESSIS GESTION, S.G.I.I.C., S.A.", "register_date": "28/09/2007", "address": "Calle Jorge Manrique Nº 12 - 28006 Madrid"},
    {"register_number": "224", "name": "AZVALOR ASSET MANAGEMENT, SGIIC, S.A.", "register_date": "22/02/2008", "address": "PASEO DE LA CASTELLANA, 110 3º - 28046 MADRID"},
    {"register_number": "225", "name": "SANTA LUCIA ASSET MANAGEMENT, SGIIC, S.A.", "register_date": "31/10/2008", "address": "PLAZA DE ESPAÑA 15 - 28008 MADRID"},
    {"register_number": "226", "name": "BRIGHTGATE CAPITAL, S.G.I.I.C., S.A.", "register_date": "12/12/2008", "address": "C/ Génova, 11; 4ª planta izquierda. - 28004 MADRID"},
    {"register_number": "227", "name": "ROLNIK CAPITAL OWNERS, SGIIC, S.A.", "register_date": "04/09/2009", "address": "Plaza de Alonso Martínez, 7 - 1º izquierda - 28004 Madrid"},
    {"register_number": "229", "name": "JULIUS BAER GESTION, SGIIC, S.A.", "register_date": "05/03/2010", "address": "PASEO DE LA CASTELLANA, 7 PLANTA 2ª - 28046 MADRID"},
    {"register_number": "230", "name": "ALANTRA MULTI ASSET, SGIIC, S.A.", "register_date": "26/03/2010", "address": "CALLE JOSE ORTEGA Y GASSET 29 - 28006 MADRID"},
    {"register_number": "232", "name": "AMISTRA, SGIIC, S.A.", "register_date": "28/05/2010", "address": "LUCHANA, 6 - 48008 BILBAO"},
    {"register_number": "234", "name": "ACACIA INVERSION, SGIIC, S.A.", "register_date": "30/12/2010", "address": "GRAN VIA DE D. DIEGO LOPEZ DE HARO, 40 BIS - 48009 BILBAO"},
    {"register_number": "236", "name": "AZORA GESTION, SGIIC, S.A.", "register_date": "09/03/2012", "address": "C/ VILLANUEVA 2 C, ESC. 1, PLANTA. 1, PUERTA 7 A - 28001 MADRID"},
    {"register_number": "237", "name": "ANDBANK WEALTH MANAGEMENT, SGIIC, S.A.U.", "register_date": "17/05/2013", "address": "CALLE SERRANO, 37 - 28001 MADRID"},
    {"register_number": "238", "name": "ABACO CAPITAL, SGIIC, S.A.", "register_date": "09/05/2014", "address": "Paseo General Martínez Campos 47 - 28010 Madrid"},
    {"register_number": "239", "name": "MAGALLANES VALUE INVESTORS, S.A., SGIIC", "register_date": "05/12/2014", "address": "C/ LAGASCA, 88 - 28001 MADRID"},
    {"register_number": "240", "name": "ARCANO CAPITAL, SGIIC, S.A.", "register_date": "06/03/2015", "address": "C/ JOSÉ ORTEGA Y GASSET, 29 - 4ª - 28006 MADRID"},
    {"register_number": "241", "name": "PATRIVALOR, SGIIC, S.A.", "register_date": "04/05/2015", "address": "PASEO DE LA CASTELLANA, 12 - 2º D - 28046 MADRID"},
    {"register_number": "242", "name": "QUADRIGA ASSET MANAGERS, SGIIC, S.A.", "register_date": "12/06/2015", "address": "CUESTA DEL SAGRADO CORAZON, 6-8 - 28016 MADRID"},
    {"register_number": "246", "name": "ATTITUDE GESTION, SGIIC, S.A.", "register_date": "12/02/2016", "address": "CALLE ORENSE, 68 PLANTA 11 - 28020 MADRID"},
    {"register_number": "247", "name": "ALTAMAR PRIVATE EQUITY, S.G.I.I.C., S.A.", "register_date": "19/02/2016", "address": "Pº CASTELLANA, 91 - 28046 MADRID"},
    {"register_number": "248", "name": "SOLVENTIS S.G.I.I.C., S.A.", "register_date": "26/02/2016", "address": "PASEO CASTELLANA 60, 4ª PLANTA DERECHA - 28046 MADRID"},
    {"register_number": "250", "name": "VARIANZA GESTION, SGIIC, S.A.", "register_date": "16/09/2016", "address": "CALLE ZURBANO 23 1º IZQUIERDA - 28010 MADRID"},
    {"register_number": "251", "name": "COBAS ASSET MANAGEMENT, SGIIC, S.A.", "register_date": "03/02/2017", "address": "Paseo de la Castellana, 53 2ª planta - 28046 Madrid"},
    {"register_number": "252", "name": "MIRALTA ASSET MANAGEMENT SGIIC, SAU", "register_date": "13/02/2017", "address": "PZA DE MANUEL GOMEZ MORENO, 2 E. PUERTA 1, 2A PLANTA - 28020 MADRID"},
    {"register_number": "253", "name": "ACCI CAPITAL INVESTMENTS, SGIIC, S.A.", "register_date": "05/05/2017", "address": "MARQUES DE VILLAMEJOR, 5, PLANTA 1 - 28006 MADRID"},
    {"register_number": "254", "name": "ALALUZ CAPITAL, SGIIC, S.A.", "register_date": "26/05/2017", "address": "VILLANUEVA, 15 1ª PLANTA - 28001 MADRID"},
    {"register_number": "256", "name": "BUY & HOLD CAPITAL, SGIIC, S.A.", "register_date": "02/06/2017", "address": "C/ CULTURA 1-1 - 46002 VALENCIA"},
    {"register_number": "257", "name": "FINLETIC CAPITAL SGIIC SA.", "register_date": "28/07/2017", "address": "C/ MIGUEL ANGEL 21, 6ª PLANTA - 28010 MADRID"},
    {"register_number": "260", "name": "ALANTRA EQMC ASSET MANAGEMENT, SGIIC, S.A.", "register_date": "16/02/2018", "address": "CALLE JOSE ORTEGA Y GASSET 29 - 28006 MADRID"},
    {"register_number": "261", "name": "GINVEST ASSET MANAGEMENT, SGIIC, S.A.", "register_date": "23/02/2018", "address": "CERVERI, 16, 1ª PLANTA - 17001 GIRONA"},
    {"register_number": "263", "name": "HOROS ASSET MANAGEMENT, SGIIC, S.A.", "register_date": "16/03/2018", "address": "CALLE NUÑEZ DE BALBOA 120, 2º IZQUIERDA - 28006 MADRID"},
    {"register_number": "264", "name": "LORETO INVERSIONES, SGIIC, SA", "register_date": "13/04/2018", "address": "PASEO DE LA CASTELLANA, Nº 40, 5ª PLANTA - 28046 MADRID"},
    {"register_number": "265", "name": "MUZA GESTIÓN DE ACTIVOS, SGIIC, S.A.", "register_date": "21/05/2018", "address": "CASTELLÓ, 128 9º - 28006 MADRID"},
    {"register_number": "266", "name": "VALENTUM ASSET MANAGEMENT, SGIIC, S.A.", "register_date": "29/06/2018", "address": "CALLE CASTELLO 128, 9ª PLANTA - 28006 MADRID"},
    {"register_number": "267", "name": "NAO ASSET MANAGEMENT, E.S.G. SGIIC, S.A.", "register_date": "20/07/2018", "address": "Plaza del Ayuntamiento núm. 27, 7ª planta - 46002 Valencia"},
    {"register_number": "268", "name": "BEKA ASSET MANAGEMENT, SGIIC, S.A.", "register_date": "28/09/2018", "address": "Calle Serrano 88, planta 7ª - 28006 Madrid"},
    {"register_number": "269", "name": "MARKET PORTFOLIO ASSET MANAGEMENT, S.G.I.I.C., S.A.", "register_date": "19/10/2018", "address": "CALLE ALMAGRO, 26. ENTREPLANTA IZQUIERDA - 28010 MADRID"},
    {"register_number": "270", "name": "AUGUSTUS CAPITAL ASSET MANAGEMENT, SGIIC, S.A.", "register_date": "08/11/2018", "address": "PLAZA DE ARAGÓN, 10 - 10º - 50004 ZARAGOZA"},
    {"register_number": "271", "name": "SASSOLA PARTNERS, SGIIC, S.A.", "register_date": "01/03/2019", "address": "CALLE ALMAGRO Nº26, ESC IZQ, PLANTA 1ºB - 28010 MADRID"},
    {"register_number": "273", "name": "AMCHOR INVESTMENT STRATEGIES, SGIIC, S.A.", "register_date": "26/04/2019", "address": "CALLE VELÁZQUEZ, 166 - 28002 MADRID"},
    {"register_number": "274", "name": "AFI INVERSIONES GLOBALES, SGIIC, S.A.", "register_date": "19/07/2019", "address": "C/ MARQUES DE VILLAMEJOR 5 - 28006 MADRID"},
    {"register_number": "275", "name": "TRUE VALUE INVESTMENTS, SGIIC, S.A.", "register_date": "30/07/2019", "address": "Calle Serrano,111. Bajo izquierda - 28001 Madrid"},
    {"register_number": "277", "name": "OLEA GESTION DE ACTIVOS, SGIIC, S.A.", "register_date": "11/11/2019", "address": "C/ VELAZQUEZ 76 - 1º DERECHA - 28001 MADRID"},
    {"register_number": "278", "name": "GREENSIDE ASSET MANAGEMENT SGIIC, S.A.", "register_date": "27/03/2020", "address": "C/ RAFAEL CALVO, 42. ESC. IZQUIERDA.1º IZQ. - 28010 MADRID"},
    {"register_number": "279", "name": "GLOBAL SOCIAL IMPACT INVESTMENTS SGIIC, S.A.", "register_date": "10/07/2020", "address": "Paseo de la Castellana 53, 2ª planta - 28046 Madrid"},
    {"register_number": "280", "name": "TALENTA GESTION, SGIIC, S.A.", "register_date": "09/04/2021", "address": "PASSATGE DE LA CONCEPCIO, 7-9, PRIMER PISO - 08008 BARCELONA"},
    {"register_number": "281", "name": "IMPACT BRIDGE ASSET MANAGEMENT SGIIC, S.A.", "register_date": "14/05/2021", "address": "CALLE VIRGEN MARÍA, 5, ESC. 3 - 2A - 28007 MADRID"},
    {"register_number": "282", "name": "ALTERNA INVERSIONES Y VALORES, S.G.I.I.C., S.A.", "register_date": "04/06/2021", "address": "C/ MARQUÉS DE LA ENSENADA, 4 planta 2ª - 28004 MADRID"},
    {"register_number": "283", "name": "PROALTUS CAPITAL AM SGIIC, S.A.", "register_date": "03/09/2021", "address": "Calle Alvaro Caballero 14 planta 1-P - 28023 Madrid"},
    {"register_number": "284", "name": "PANZA CAPITAL, SGIIC, S.A.", "register_date": "09/09/2022", "address": "C/ SERRANO 45, PLANTA 4ª - 28001 MADRID"},
    {"register_number": "285", "name": "DIAGONAL ASSET MANAGEMENT SGIIC, S.A.", "register_date": "28/10/2022", "address": "AVENIDA DIAGONAL, Nº 467, 2º 2 - 08036 BARCELONA"},
    {"register_number": "286", "name": "ACTYUS PRIVATE EQUITY SGIIC, S.A.", "register_date": "24/02/2023", "address": "CALLE SERRANO, 37 - 28001 MADRID"},
    {"register_number": "287", "name": "SANTANDER ALTERNATIVE INVESTMENTS, SGIIC, S.A.U.", "register_date": "07/07/2023", "address": "PASEO DE LA CASTELLANA 24 - 28046 MADRID"},
    {"register_number": "288", "name": "ANTA ASSET MANAGEMENT SGIIC, SOCIEDAD ANÓNIMA", "register_date": "07/07/2023", "address": "C/ZURBANO, 46 LOCAL - 28010 MADRID"},
    {"register_number": "289", "name": "CRESCENTA INVESTMENTS, SGIIC, S.A.", "register_date": "13/10/2023", "address": "PASEO DE LA CASTELLANA NÚMERO 163, PLANTA 3ª - 28046 MADRID"},
    {"register_number": "290", "name": "WHITEHOLE INVESTMENT PARTNERS, SGIIC, S.A.", "register_date": "26/04/2024", "address": "PLAZA EUSKADI 5 TORRE IBERDROLA, PLANTA 20 - 48009 VIZCAYA"},
    {"register_number": "291", "name": "SILVER ALPHA ASSET MANAGEMENT SGIIC, S.A.", "register_date": "26/04/2024", "address": "AVENIDA DE CONCHA ESPINA 8, 1 IZQUIERDA - 28036 MADRID"},
    {"register_number": "292", "name": "SELECCION E INVERSION DE CAPITAL GLOBAL, SGIIC, S.A.", "register_date": "28/06/2024", "address": "C/ DEL SIL 50, BAJO - 28002 MADRID"},
    {"register_number": "293", "name": "HAMCO AM, SGIIC, S.A.", "register_date": "30/07/2024", "address": "Paseo de la Castellana 141, 19ª Planta - 28046 Madrid"},
    {"register_number": "294", "name": "CAAN ALTERNATIVE ASSET MANAGEMENT, SGIIC, S.A.", "register_date": "22/11/2024", "address": "AVDA. DIAGONAL, 644 - 08017 BARCELONA"},
    {"register_number": "295", "name": "MACROFLOW PARTNERS SGIIC, S.L.", "register_date": "11/07/2025", "address": "CALLE JOSÉ LÁZARO GALDIANO, 4. PLANTA 7ª - Dcha. - 28036 MADRID"},
    {"register_number": "296", "name": "TESYS ACTIVOS FINANCIEROS SGIIC, SOCIEDAD LIMITADA", "register_date": "24/07/2025", "address": "Paseo de la Habana, nº 15, 3º Izq. - 28036 MADRID"},
]

print(f"Total companies in dataset: {len(companies_raw)}")

# Process and structure the data
companies_final = []
for comp in companies_raw:
    name = comp['name']
    reg_num = comp['register_number']
    reg_date = comp['register_date']
    address_full = comp['address']

    # Parse address
    street, city, postal_code = parse_address(address_full)

    company_entry = {
        "name": name,
        "register_number": reg_num,
        "register_date": reg_date,
        "address": address_full,
        "street": street if street != address_full else "",
        "city": city,
        "postal_code": postal_code,
        "country": "ES",
        "source": "CNMV Registry 2025"
    }
    companies_final.append(company_entry)

# Write to output file
output_file = "/Users/test/Documents/ALFORIS FINANCE/06. CRM/V1/scripts/cnmv/output/cnmv_all_sgiic_raw.json"
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(companies_final, f, indent=2, ensure_ascii=False)

print(f"\nWrote {len(companies_final)} companies to {output_file}")

# Print statistics
with_street = sum(1 for c in companies_final if c['street'])
with_city = sum(1 for c in companies_final if c['city'])
with_postal = sum(1 for c in companies_final if c['postal_code'])

print(f"\nStatistics:")
print(f"  Companies with parsed street: {with_street}")
print(f"  Companies with parsed city: {with_city}")
print(f"  Companies with parsed postal code: {with_postal}")

# Show first and last entries
print(f"\nFirst company:")
print(f"  #{companies_final[0]['register_number']}: {companies_final[0]['name']}")
print(f"  Date: {companies_final[0]['register_date']}")
print(f"  City: {companies_final[0]['city']}, Postal: {companies_final[0]['postal_code']}")

print(f"\nLast company:")
print(f"  #{companies_final[-1]['register_number']}: {companies_final[-1]['name']}")
print(f"  Date: {companies_final[-1]['register_date']}")
print(f"  City: {companies_final[-1]['city']}, Postal: {companies_final[-1]['postal_code']}")

print("\nDone!")
