"""Sincroniza la lista de precios de Wankun Club.

Entradas (JSON con el resultado de get_values, clave "values"):
  --lista      'Lista de precios'!A1:J300 del Sheet Ventas (12hLk00E3eT9ORZyrk-gHw7dQgUhGJhA1iSbLn5genVI)
  --productos  Productos!A1:S60 de Precios_Wankun (1Dx1gDErRnpdm0Uu97P9rsMwS-QNpDwqLdOoeJhru70o)
Variable de entorno CLAVE = clave de costos del panel.

Salidas:
  - escribe precios.json del repo (precios + costos cifrados)
  - escribe /tmp/lista_vete.html (página del artifact, sin costos)
  - imprime JSON con: cambios de la hoja (filas a corregir de los Royal ML),
    avisos y si hubo cambios de precios respecto del precios.json anterior.
"""
import argparse, base64, hashlib, json, math, os, re

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(AQUI)


def num(s):
    s = str(s).replace('$', '').replace(' ', '').replace(' ', '').strip()
    if not s or s in ('-',):
        return None
    if re.fullmatch(r'-?\d+(,\d+)?', s):
        s = s.replace(',', '.')
    elif re.fullmatch(r'-?\d+\.\d{1,2}', s):  # 78768.7 → decimal con punto
        pass
    else:
        s = s.replace('.', '').replace(',', '.')
    try:
        return float(s)
    except ValueError:
        return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--lista', required=True)
    ap.add_argument('--productos', required=True)
    ap.add_argument('--vigente', required=True, help='AAAA-MM-DD')
    a = ap.parse_args()

    cfg = json.load(open(os.path.join(AQUI, 'precios_meta.json')))
    meta, ml_map, fijos = cfg['meta'], cfg['ml_productos'], cfg['fijos']
    rows = json.load(open(a.lista))['values']
    prod = json.load(open(a.productos))['values']
    avisos, cambios_hoja = [], []

    # 1) Precios de los Royal atados a ML (Precios_Wankun, columnas R y S)
    ml = {}
    for r in prod:
        if len(r) > 18 and r[0] in ml_map:
            t, c = num(r[17]), num(r[18])
            if t and c:
                ml[ml_map[r[0]]] = (int(t), int(c))
        elif r and r[0] and ' · ' in r[0] and r[0] not in ml_map:
            avisos.append(f'Producto nuevo en Precios_Wankun sin SKU asignado: {r[0]}')

    # 2) Lista de precios
    items, costos, vistos = [], {}, set()
    for i, r in enumerate(rows):
        fila = i + 1
        r = r + [''] * (10 - len(r))
        sku = r[4].strip()
        if not sku or sku.upper() in ('SKU', 'VALOR QUE BUSCA', 'MARCA-PERROREFERENCIA-KG'):
            continue
        k, co, t, c = num(r[2]), num(r[5]), num(r[7]), num(r[9])
        if not k:
            continue
        if not t:
            avisos.append(f'{sku} (fila {fila}) sin precio de venta')
            continue
        if sku in ml:
            mt, mc = ml[sku]
            if int(t) != mt or (c and int(c) != mc):
                cambios_hoja.append({'fila': fila, 'sku': sku, 'H': mt, 'J': mc})
            t, c = mt, mc
        elif sku in fijos:
            c = fijos[sku]
        if not c:
            c = math.ceil(round(t * 1.05, 2) / 100) * 100
        if sku in vistos:
            avisos.append(f'{sku} repetido (fila {fila})')
            continue
        vistos.add(sku)
        m = meta.get(sku)
        if not m:
            avisos.append(f'SKU nuevo sin nombre armado: {sku} (fila {fila}), se publica como "{r[1] or r[0]}"')
            m = {'m': '', 'l': '', 'p': (r[1] or r[0]).strip(), 'e': 'Gato' if 'CAT' in sku.upper() else 'Perro'}
        items.append({'s': sku, **m, 'k': k, 't': int(t), 'c': int(c)})
        if co:
            costos[f'{sku}|{k:.1f}'] = round(co, 2)
        else:
            avisos.append(f'{sku} sin costo')

    # 3) ¿Cambió algo?
    P = os.path.join(REPO, 'precios.json')
    viejo = json.load(open(P))
    clave = os.environ['CLAVE'].encode()
    b = lambda s: base64.b64decode(s)
    x = viejo['x']
    kv = hashlib.pbkdf2_hmac('sha256', clave, b(x['s']), x['n'], 32)
    costos_viejos = json.loads(AESGCM(kv).decrypt(b(x['i']), b(x['c']), None))
    clave_items = lambda its: sorted((i['s'], i['k'], i['t'], i['c'], i['p']) for i in its)
    hubo = clave_items(viejo['items']) != clave_items(items) or costos_viejos != costos

    if hubo:
        salt, iv = os.urandom(16), os.urandom(12)
        k2 = hashlib.pbkdf2_hmac('sha256', clave, salt, 250000, 32)
        ct = AESGCM(k2).encrypt(iv, json.dumps(costos, separators=(',', ':')).encode(), None)
        out = {'vigente': a.vigente, 'items': items,
               'x': {'s': base64.b64encode(salt).decode(), 'i': base64.b64encode(iv).decode(),
                     'c': base64.b64encode(ct).decode(), 'n': 250000}}
        json.dump(out, open(P, 'w'), ensure_ascii=False, separators=(',', ':'))
        data = [{k: i[k] for k in ('m', 'p', 'e', 'k', 't', 'c', 'l')} for i in
                sorted(items, key=lambda i: (i['m'], i['e'], i['p'], i['k']))]
        h = open(os.path.join(AQUI, 'plantilla_lista_vete.html')).read()
        fecha = '/'.join(reversed(a.vigente.split('-')))
        h = h.replace('__DATA__', json.dumps(data, ensure_ascii=False)).replace('Vigente desde el 14/11/2026', f'Vigente desde el {fecha}')
        open('/tmp/lista_vete.html', 'w').write(h)

    print(json.dumps({'hubo_cambios': hubo, 'productos': len(items), 'cambios_hoja': cambios_hoja,
                      'avisos': avisos}, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
