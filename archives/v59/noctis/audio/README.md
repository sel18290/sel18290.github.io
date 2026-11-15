# NOCTIS — ressources sonores originales
soundscape.js est la source exportable de tous les sons procéduraux Web Audio. Aucun enregistrement externe, lien audio distant, voix synthétique ou musique permanente. Aucune dépendance.

Timbres : alarme sinusoïdale harmonique filtrée 220→2400 Hz sur 2,3 s ; froissement de tissu par bruit filtré ; terminal avec montée triangle et signal de disponibilité ; servo par bruit médium et oscillateur grave ; signatures ORBI-7 à deux notes ; verrou métallique par bruit et grave ; ouverture par souffle mécanique à plusieurs bandes, queue de réverbération courte et texture de couloir ; NOCTIS par trois harmoniques espacées. Fond : bruit ventilé filtré, trois moteurs graves, lente modulation et pulsations espacées.

Les variantes sont produites au clic. La signature journal ne joue qu’à sa première découverte. Fragment : variante après déverrouillage. Sons d’erreur et de réussite distincts. Stéréo limitée à ±0,4 pour compatibilité mono.

Un contexte audio par page et une seule instance de l’ambiance. Volume de sortie progressif et compression. Préférences noctis.audio.v1 locales. Aucun démarrage avant geste explicite. Repli silencieux si Web Audio indisponible ou reprise refusée. Mise en pause à la perte de visibilité. Aucune promesse de niveau acoustique réel : régler le volume de l’appareil selon ses haut-parleurs.

## N01-S2 — expressions ORBI-7
orbi-voice.js : synthèse FM originale, sept intentions (salutation, question, indice, erreur curieuse, bonne réponse, félicitations, curiosité), trois variantes de registre/timbre. Phrases de 2–4 notes, moins d’une seconde, stéréo douce. Une seule phrase active ; la suivante remplace les oscillateurs précédents, arrêt à la fermeture/muet/onglet masqué. Aucun échantillon ou son de franchise réutilisé. Servomoteur, alarme, fond et bruitages d’objets N01-S préservés. Les anciennes pulsations périodiques pendant le dialogue sont retirées : pas de son par lettre ni de boucle vocale.

## Renforcement des objets
Alarme : motif 520→650 / 780→1040 / 650→520 Hz, trois appels, triangle et harmonique sinusoïdale ; filtrage 220→3200 Hz pendant le réveil. Porte verrouillée : balayage mécanique, choc bruité et résonances inharmoniques 173/461/727 Hz, puis deux impulsions graves descendantes. Terminal : contact grave, balayage de bruit résonant 280→4200 Hz, alimentation triangle 140→700 Hz, verre électronique 1100→2400 Hz, accord final 880/1320 Hz. Aucune modification de l’horloge, des dialogues ou des images.
