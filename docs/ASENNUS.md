# Amazing Weather Card — asennus suomeksi

Kortti yhdistää oman sääasemasi mittaukset, historian ja sääennusteen. Tumman ja vaalean teeman lisäksi siinä on suomenkielinen käyttöliittymä ja asetuseditori.

## Asenna HACSista

1. Avaa Home Assistantissa **HACS**.
2. Valitse oikean yläkulman **⋮ → Custom repositories / Mukautetut tietovarastot**.
3. Lisää osoite `https://github.com/raunosr/ha-amazing-weather-card` ja tyypiksi **Dashboard**.
4. Lataa **Amazing Weather Card**.
5. Päivitä selaimen tai Companion Appin näkymä.
6. Muokkaa kojelautaa ja valitse **Lisää kortti → Amazing Weather Card**.
7. Valitse sääennusteen entiteetti ja oman sääasemasi anturit.

Tämä on HACS-yhteensopiva mukautettu tietovarasto. Kortti ei vielä kuulu HACS:n oletushakuun ilman tietovaraston lisäämistä.

HACS näyttää kojelautakorteille laatikkokuvakkeen. Projektin oma logo ei korvaa tätä HACS:n kategoriakuvaketta; asennuksessa ei ole tämän vuoksi vikaa.

Valitse kortin teemaksi **Automaattinen / HA-teema** (`theme: auto`), kun haluat sen käyttävän kojelautasi värejä ja läpinäkyvyyttä. `dark` ja `light` käyttävät kortin omia värejä. Sääikonin animaatio toimii, kun `animated: true`; laitteen vähennetyn liikkeen asetus pysäyttää animaatiot.

Jos kortti ei ilmesty valikkoon, tarkista kojelaudan resurssit. Seuraavan osoitteen tulee olla mukana kerran tyypillä **JavaScript Module**:

```text
/hacsfiles/ha-amazing-weather-card/ha-amazing-weather-card.js
```

## Oma sääasema käyttöön

Voit aloittaa pelkällä sääennusteella:

```yaml
type: custom:ha-amazing-weather-card
entity: weather.home
name: Kotipihan sää
language: fi
```

Vaihda `weather.home` oman sääpalvelusi entiteetin nimeksi. Löydät tunnisteet Home Assistantin kehittäjätyökalujen tilanäkymästä tai entiteettivalitsimesta.

Esimerkki kaikilla sääaseman antureilla:

```yaml
type: custom:ha-amazing-weather-card
entity: weather.home
name: Kotipihan sää
language: fi
theme: auto
temperature_entity: sensor.outdoor_temperature
feels_like_entity: sensor.feels_like
humidity_entity: sensor.outdoor_humidity
pressure_entity: sensor.air_pressure
uv_entity: sensor.uv_index
wind_speed_entity: sensor.wind_speed
wind_gust_entity: sensor.wind_gust
wind_direction_entity: sensor.wind_direction
rain_today_entity: sensor.rain_today
rain_total_entity: sensor.rain_total
```

**Esimerkin anturinimet ovat paikkamerkkejä.** Vaihda ne omiin antureihisi ja poista rivit, joille sinulla ei ole anturia. Sama onnistuu kortin visuaalisessa editorissa.

`rain_today_entity` tarkoittaa päivän aikana kertynyttä sademäärää, joka nollautuu paikallisena keskiyönä. `rain_total_entity` tarkoittaa kasvavaa kokonaiskertymää. Jos molemmat löytyvät, päivän määrä otetaan päiväanturista ja tuntisade lasketaan kokonaiskertymän muutoksista. Sateen voimakkuusanturi, jonka yksikkö on mm/h, ei käy näihin kenttiin.

## Kortin lukeminen

- **Ylhäällä:** nykyinen lämpötila, tuntuu kuin -lukema, tuulen nopeus ja mistä tuulee. Sääikoni ja kuvaus tulevat sääpalvelulta.
- **Mitattu tänään:** oman lämpötila-anturin tallennetun historian alin ja ylin arvo. Sateen vieressä näkyy erikseen jo satanut määrä ja ennustettu määrä aikaväleineen.
- **24 h:** selaa sormella sivuttain. Vasen suunta vie mittaushistoriaan, oikea tulevaan. Yhtenäinen lämpötilaviiva on mitattu, katkoviiva ennustettu. Sadepalkit ja tuuliluvut luetaan samasta aikajaksosta.
- **7 pv / 10 pv:** yksi sarake vastaa yhtä päivää. Lyhyempi ennuste näytetään todellisen pituutensa mukaan; puuttuvia päiviä ei keksitä.
- **Napauta kuvaajaa:** valitun hetken tarkat tiedot. Suurennuspainike avaa isomman näkymän.
- **Nyt:** palaa nykyhetkeen. Tavallisessa käytössä kuvaaja pysyy valitsemassasi kohdassa.
- **Tuuliruusu:** avaa mittauksiin perustuvan tuulijakauman. Nuoli ja merkki kertovat suunnan, josta tuuli tulee.
- **Kuun kuva:** avaa kuun vaiheen, valaistun osuuden ja tiedon siitä, onko kuu horisontin yläpuolella.

## Seinänäyttö

Jos kortti jää koko perheen yhteiselle näytölle, lisää:

```yaml
wall_mode: true
return_after: 60
```

Kortti palautuu Nyt-näkymään minuutin käyttötauon jälkeen. Auki oleva lisätietonäkymä estää automaattisen palautumisen. Henkilökohtaisessa käytössä oletus `wall_mode: false` on rauhallisempi.

## Sijainti, historia ja puuttuvat tiedot

Auringon ajat ja kuun tiedot lasketaan Home Assistantin sijainnille. Päivämäärät ja kellonajat noudattavat sen aikavyöhykettä. Sijainnin voi ohittaa kortin asetuksista antamalla sekä `latitude`- että `longitude`-arvon. Kuun vaihe on sama eri paikoissa samalla hetkellä; kuun näkyminen horisontin yläpuolella riippuu sijainnista. Napaseudulla nousua tai laskua ei välttämättä tapahdu kyseisenä päivänä.

Historia vaatii, että Home Assistant tallentaa valitut anturit recorderilla ja käyttäjällä on pääsy niihin. Puuttuva tieto näkyy merkkinä `—`. Nolla tarkoittaa oikeasti nollaa. Jos oma anturi on valittu ja yhteys katkeaa, kortti ei vaihda lukemaa huomaamatta sääpalvelun arvioon.

Automaattiset testit kattavat tiedonkäsittelyn, selaimen käyttöliittymän, teemat ja julkaistavan tiedoston. Oman palvelusi ennustetiedot ja anturien yksiköt kannattaa tarkistaa käyttöönotossa.

[Kaikki asetukset englanniksi](configuration.md) · [Datan käsittely ja suunnitteluratkaisut](data-and-design.md) · [Ilmoita ongelmasta](https://github.com/raunosr/ha-amazing-weather-card/issues)
