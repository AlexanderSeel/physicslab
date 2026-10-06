#!/usr/bin/env python3
"""Generate the PhysicsLab starter asset library as editable .blend files and runtime .glb files.

Run with:
  blender --background --python tools/blender/generate_assets.py 
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


COLORS = {
    "teal": (0.10, 0.34, 0.31, 1.0),
    "dark_teal": (0.045, 0.14, 0.14, 1.0),
    "orange": (0.78, 0.25, 0.09, 1.0),
    "orange_light": (0.95, 0.49, 0.22, 1.0),
    "blue": (0.12, 0.28, 0.52, 1.0),
    "blue_light": (0.27, 0.56, 0.72, 1.0),
    "yellow": (0.92, 0.62, 0.09, 1.0),
    "red": (0.72, 0.12, 0.09, 1.0),
    "green": (0.15, 0.48, 0.27, 1.0),
    "rubber": (0.035, 0.045, 0.05, 1.0),
    "steel": (0.35, 0.43, 0.44, 1.0),
    "silver": (0.64, 0.71, 0.69, 1.0),
    "wood": (0.39, 0.22, 0.12, 1.0),
    "glass": (0.30, 0.66, 0.69, 0.42),
    "white": (0.86, 0.88, 0.82, 1.0),
    "black": (0.018, 0.024, 0.025, 1.0),
}


ASSETS = {
    "ball": {"builder": "ball", "collider": {"type": "sphere", "radius": 0.22}, "sockets": []},
    "cube": {"builder": "cube", "collider": {"type": "box", "size": [0.385, 0.385, 0.385]}, "sockets": []},
    "weight": {"builder": "weight", "collider": {"type": "box", "size": [0.42, 0.34, 0.28]}, "sockets": ["INTERACTION_HANDLE"]},
    "ramp": {"builder": "ramp", "collider": {"type": "box", "size": [5.2, 1.5, 0.16]}, "sockets": ["CONTACT_START", "CONTACT_END"]},
    "platform": {"builder": "platform", "collider": {"type": "box", "size": [2.4, 1.6, 0.24]}, "sockets": ["CONTACT_TOP"]},
    "lever": {"builder": "lever", "collider": {"type": "box", "size": [2.6, 0.22, 0.16]}, "sockets": ["HINGE_AXIS", "CONTACT_LEFT", "CONTACT_RIGHT"]},
    "hinge": {"builder": "hinge", "collider": {"type": "compound", "size": [0.8, 0.5, 0.5]}, "sockets": ["HINGE_AXIS"]},
    "spring": {"builder": "spring", "collider": {"type": "capsule", "radius": 0.12, "height": 1.1}, "sockets": ["SPRING_TOP", "SPRING_BOTTOM"]},
    "domino": {"builder": "domino", "collider": {"type": "box", "size": [0.16, 0.09, 0.48]}, "sockets": []},
    "pulley": {"builder": "pulley", "collider": {"type": "cylinder", "radius": 0.45, "height": 0.16}, "sockets": ["SHAFT_AXIS", "ROPE_GUIDE"]},
    "water_wheel": {"builder": "water_wheel", "collider": {"type": "cylinder", "radius": 0.7, "height": 0.18}, "sockets": ["SHAFT_AXIS"]},
    "bucket": {"builder": "bucket", "collider": {"type": "cylinder", "radius": 0.36, "height": 0.62}, "sockets": ["FLUID_IN"]},
    "water_tank": {"builder": "water_tank", "collider": {"type": "box", "size": [1.0, 0.8, 1.2]}, "sockets": ["FLUID_IN", "FLUID_OUT", "PRESSURE_PORT"]},
    "pipe": {"builder": "pipe", "collider": {"type": "cylinder", "radius": 0.11, "height": 1.0}, "sockets": ["FLUID_IN", "FLUID_OUT"]},
    "valve": {"builder": "valve", "collider": {"type": "compound", "size": [0.8, 0.5, 0.5]}, "sockets": ["FLUID_IN", "FLUID_OUT", "INTERACTION_HANDLE"]},
    "pump": {"builder": "pump", "collider": {"type": "box", "size": [0.8, 0.6, 0.9]}, "sockets": ["FLUID_IN", "FLUID_OUT", "INTERACTION_HANDLE"]},
    "balloon": {"builder": "balloon", "collider": {"type": "sphere", "radius": 0.42}, "sockets": ["GAS_PORT"]},
    "fan": {"builder": "fan", "collider": {"type": "box", "size": [0.9, 0.4, 0.9]}, "sockets": ["ELECTRICAL_IN", "AIR_OUT", "SHAFT_AXIS"]},
    "battery": {"builder": "battery", "collider": {"type": "box", "size": [0.5, 0.32, 0.72]}, "sockets": ["ELECTRICAL_POSITIVE", "ELECTRICAL_NEGATIVE"]},
    "switch": {"builder": "switch", "collider": {"type": "box", "size": [0.62, 0.42, 0.24]}, "sockets": ["WIRE_IN", "WIRE_OUT", "INTERACTION_HANDLE"]},
    "lamp": {"builder": "lamp", "collider": {"type": "cylinder", "radius": 0.24, "height": 0.62}, "sockets": ["WIRE_IN", "WIRE_OUT"]},
    "led": {"builder": "led", "collider": {"type": "cylinder", "radius": 0.12, "height": 0.2}, "sockets": ["WIRE_IN", "WIRE_OUT"]},
    "resistor": {"builder": "resistor", "collider": {"type": "cylinder", "radius": 0.09, "height": 0.42}, "sockets": ["WIRE_IN", "WIRE_OUT"]},
    "motor": {"builder": "motor", "collider": {"type": "cylinder", "radius": 0.3, "height": 0.58}, "sockets": ["ELECTRICAL_IN", "ELECTRICAL_OUT", "SHAFT_AXIS"]},
    "generator": {"builder": "generator", "collider": {"type": "cylinder", "radius": 0.34, "height": 0.7}, "sockets": ["SHAFT_AXIS", "ELECTRICAL_POSITIVE", "ELECTRICAL_NEGATIVE"]},
    "burner": {"builder": "burner", "collider": {"type": "cylinder", "radius": 0.44, "height": 0.42}, "sockets": ["THERMAL_OUT", "GAS_IN"]},
    "pressure_gauge": {"builder": "pressure_gauge", "collider": {"type": "cylinder", "radius": 0.38, "height": 0.16}, "sockets": ["PRESSURE_PORT"]},
    "thermometer": {"builder": "thermometer", "collider": {"type": "box", "size": [0.12, 0.12, 0.9]}, "sockets": ["TEMPERATURE_PROBE"]},
    "sensor": {"builder": "sensor", "collider": {"type": "box", "size": [0.38, 0.3, 0.22]}, "sockets": ["SENSOR_INPUT", "LOGIC_OUT"]},
}


def clear_scene():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0


def _linear_to_srgb(value):
    value = max(0.0, min(1.0, value))
    return 12.92 * value if value < 0.0031308 else 1.055 * (value ** (1.0 / 2.4)) - 0.055


def _texture_pixels(image, pixels):
    image.pixels.foreach_set(pixels)
    image.file_format = "PNG"
    image.pack()
    return image


def _make_pbr_maps(name, color, roughness, style):
    """Create packed, tileable PBR maps that the glTF exporter can embed."""
    size = 128
    seed = sum(ord(char) for char in name) * 0.017
    height = [[0.0] * size for _ in range(size)]
    modulation = [[0.0] * size for _ in range(size)]
    for y in range(size):
        v = y / size
        for x in range(size):
            u = x / size
            fine = math.sin(2 * math.pi * (u * 37 + 0.19 * math.sin(v * 2 * math.pi * 5 + seed)))
            grain = math.sin(2 * math.pi * (v * 8 + 0.12 * math.sin(u * 2 * math.pi * 3 + seed)))
            noise = math.sin((x * 12.9898 + y * 78.233 + seed) * 0.73)
            if style == "wood":
                value = 0.94 + 0.055 * (0.5 + 0.5 * grain) + 0.012 * noise
                relief = 0.5 + 0.5 * grain + 0.08 * fine
            elif style == "rubber":
                value = 0.95 + 0.025 * noise + 0.012 * fine
                relief = 0.5 + 0.18 * noise + 0.12 * fine
            elif style == "metal":
                value = 0.98 + 0.012 * fine + 0.006 * noise
                relief = 0.5 + 0.12 * fine
            else:
                value = 0.985 + 0.012 * noise + 0.006 * fine
                relief = 0.5 + 0.09 * noise + 0.04 * fine
            modulation[y][x] = value
            height[y][x] = relief

    base_pixels = []
    rough_pixels = []
    normal_pixels = []
    for y in range(size):
        for x in range(size):
            factor = modulation[y][x]
            base_pixels.extend((_linear_to_srgb(color[0] * factor), _linear_to_srgb(color[1] * factor), _linear_to_srgb(color[2] * factor), color[3]))
            rough = max(0.04, min(1.0, roughness + (1.0 - factor) * 0.32))
            rough_pixels.extend((rough, rough, rough, 1.0))
            left = height[y][(x - 1) % size]
            right = height[y][(x + 1) % size]
            down = height[(y - 1) % size][x]
            up = height[(y + 1) % size][x]
            nx = -(right - left) * 5.5
            ny = -(up - down) * 5.5
            inv_length = 1.0 / math.sqrt(nx * nx + ny * ny + 1.0)
            normal_pixels.extend((0.5 + 0.5 * nx * inv_length, 0.5 + 0.5 * ny * inv_length, 0.5 + 0.5 * inv_length, 1.0))

    maps = {}
    texture_dir = Path(__file__).resolve().parent / "textures"
    for suffix, pixels, color_space in (
        ("BaseColor", base_pixels, "sRGB"),
        ("Roughness", rough_pixels, "Non-Color"),
        ("Normal", normal_pixels, "Non-Color"),
    ):
        image_name = "PL_" + name + "_" + suffix
        external_png = texture_dir / (style + "_" + suffix.lower() + ".png")
        external_jpg = texture_dir / (style + "_" + suffix.lower() + ".jpg")
        external = external_png if external_png.is_file() else external_jpg
        if external.is_file():
            image = bpy.data.images.load(str(external), check_existing=True)
            image.name = image_name
            image.pack()
        else:
            image = bpy.data.images.get(image_name)
            if image is None:
                image = bpy.data.images.new(image_name, width=size, height=size, alpha=True)
            _texture_pixels(image, pixels)
        image.colorspace_settings.name = color_space
        maps[suffix] = image
    return maps


def _connect_pbr_maps(mat, shader, name, color, roughness, style):
    maps = _make_pbr_maps(name, color, roughness, style)
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    for suffix, input_name in (("BaseColor", "Base Color"), ("Roughness", "Roughness")):
        node = nodes.new("ShaderNodeTexImage")
        node.name = name + "_" + suffix
        node.label = suffix + " map"
        node.image = maps[suffix]
        node.location = (-520, 140 if suffix == "BaseColor" else -90)
        links.new(node.outputs["Color"], shader.inputs[input_name])
    normal_image = nodes.new("ShaderNodeTexImage")
    normal_image.name = name + "_Normal"
    normal_image.label = "Normal map"
    normal_image.image = maps["Normal"]
    normal_image.location = (-520, -320)
    normal_node = nodes.new("ShaderNodeNormalMap")
    normal_node.name = name + "_NormalMap"
    normal_node.inputs["Strength"].default_value = 0.35 if style in ("wood", "rubber") else 0.18
    normal_node.location = (-250, -300)
    links.new(normal_image.outputs["Color"], normal_node.inputs["Color"])
    links.new(normal_node.outputs["Normal"], shader.inputs["Normal"])


def material(name, color, metallic=0.0, roughness=0.42, emission=0.0, texture_style="paint"):
    mat = bpy.data.materials.get("PL_" + name)
    if mat is None:
        mat = bpy.data.materials.new("PL_" + name)
    mat.diffuse_color = color
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    if shader:
        shader.inputs["Metallic"].default_value = metallic
        shader.inputs["Roughness"].default_value = roughness
        style = "metal" if metallic >= 0.45 else texture_style
        _connect_pbr_maps(mat, shader, name, color, roughness, style)
        alpha_input = shader.inputs.get("Alpha")
        if alpha_input and color[3] < 1.0:
            alpha_input.default_value = color[3]
        if "Alpha" in shader.inputs:
            shader.inputs["Alpha"].default_value = color[3]
        if emission > 0:
            emission_input = shader.inputs.get("Emission Color") or shader.inputs.get("Emission")
            if emission_input:
                emission_input.default_value = color
            strength = shader.inputs.get("Emission Strength")
            if strength:
                strength.default_value = emission
    if color[3] < 1:
        if hasattr(mat, "surface_render_method"):
            mat.surface_render_method = "DITHERED"
        elif hasattr(mat, "blend_method"):
            mat.blend_method = "BLEND"
    return mat


def parent_asset(obj, root):
    obj.parent = root
    return obj


def mesh_material(obj, mat_name, color_key, metallic=0.0, roughness=0.42, emission=0.0):
    obj.data.materials.clear()
    color = COLORS[color_key] if isinstance(color_key, str) else color_key
    style = "rubber" if obj.name.lower().startswith("ball") else color_key if isinstance(color_key, str) else "paint"
    obj.data.materials.append(material(mat_name, color, metallic, roughness, emission, style))
    return obj


def make_root(asset_id):
    root = bpy.data.objects.new("ASSET_ROOT_" + asset_id, None)
    bpy.context.collection.objects.link(root)
    root.empty_display_type = "CUBE"
    root.empty_display_size = 0.14
    root["physicslab_asset_id"] = asset_id
    return root


def box(root, name, loc, dims, color="teal", bevel=0.025, metallic=0.0, roughness=0.42):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        modifier = obj.modifiers.new("Soft manufactured edges", "BEVEL")
        modifier.width = min(bevel, min(dims) * 0.18)
        modifier.segments = 3
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    mesh_material(obj, name + "_mat", color, metallic, roughness)
    return parent_asset(obj, root)


def cylinder(root, name, loc, radius, depth, color="steel", axis="Z", vertices=32, metallic=0.45):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc)
    obj = bpy.context.object
    obj.name = name
    if axis == "X":
        obj.rotation_euler[1] = math.pi / 2
    elif axis == "Y":
        obj.rotation_euler[0] = math.pi / 2
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    mesh_material(obj, name + "_mat", color, metallic, 0.32)
    return parent_asset(obj, root)


def sphere(root, name, loc, radius, color="teal", scale=None, metallic=0.08, roughness=0.24):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=20, radius=radius, location=loc)
    obj = bpy.context.object
    obj.name = name
    if scale:
        obj.scale = scale
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    mesh_material(obj, name + "_mat", color, metallic, roughness)
    return parent_asset(obj, root)


def torus(root, name, loc, major_radius, minor_radius, color="orange", rotation=None):
    bpy.ops.mesh.primitive_torus_add(major_radius=major_radius, minor_radius=minor_radius, major_segments=40, minor_segments=12, location=loc)
    obj = bpy.context.object
    obj.name = name
    if rotation:
        obj.rotation_euler = rotation
    mesh_material(obj, name + "_mat", color, 0.28, 0.3)
    return parent_asset(obj, root)


def cone(root, name, loc, radius1, radius2, depth, color="orange", vertices=32):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius1, radius2=radius2, depth=depth, location=loc)
    obj = bpy.context.object
    obj.name = name
    mesh_material(obj, name + "_mat", color, 0.04, 0.3)
    return parent_asset(obj, root)


def rod_between(root, name, start, end, radius, color="steel"):
    vec = Vector(end) - Vector(start)
    mid = (Vector(start) + Vector(end)) / 2
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=radius, depth=vec.length, location=mid)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = vec.to_track_quat("Z", "Y").to_euler()
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    mesh_material(obj, name + "_mat", color, 0.4, 0.3)
    return parent_asset(obj, root)


def helix(root, name, turns=7, height=0.92, radius=0.13, wire=0.022, color="orange"):
    curve = bpy.data.curves.new(name + "_curve", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 12
    curve.bevel_depth = wire
    curve.bevel_resolution = 3
    spline = curve.splines.new("POLY")
    count = turns * 20 + 1
    spline.points.add(count - 1)
    for i in range(count):
        t = i / (count - 1)
        angle = 2 * math.pi * turns * t
        spline.points[i].co = (radius * math.cos(angle), radius * math.sin(angle), height * (t - 0.5), 1)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material(name + "_mat", COLORS[color], 0.25, 0.28))
    return parent_asset(obj, root)


def socket(root, name, loc, socket_type="GENERIC"):
    marker = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(marker)
    marker.empty_display_type = "SPHERE"
    marker.empty_display_size = 0.055
    marker.location = loc
    marker["physicslab_socket_type"] = socket_type
    return parent_asset(marker, root)


def build_ball(root):
    sphere(root, "Ball_Render", (0, 0, 0.22), 0.22, "teal")
    torus(root, "Ball_Equator_Seam", (0, 0, 0.22), 0.219, 0.004, "dark_teal")
    return {"type": "sphere", "radius": 0.22}


def build_cube(root):
    box(root, "Cube_Render", (0, 0, 0.1925), (0.385, 0.385, 0.385), "blue", 0.025)
    return {"type": "box", "size": [0.385, 0.385, 0.385]}


def build_weight(root):
    box(root, "Weight_Block", (0, 0, 0.19), (0.42, 0.34, 0.28), "steel", 0.035, 0.72)
    torus(root, "Weight_Handle", (0, 0, 0.43), 0.105, 0.025, "silver")
    socket(root, "INTERACTION_HANDLE", (0, 0, 0.43), "HANDLE")
    return {"type": "box", "size": [0.42, 0.34, 0.48]}


def build_ramp(root):
    base = box(root, "Ramp_Surface", (-0.0, 0, 0), (5.2, 1.5, 0.16), "orange", 0.045)
    base.rotation_euler[1] = 0.235
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    for y in (-0.78, 0.78):
        rail = box(root, "Ramp_Rail", (0, y, 0.15), (5.2, 0.09, 0.18), "orange_light", 0.025)
        rail.rotation_euler[1] = 0.235
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    socket(root, "CONTACT_START", (-2.5, 0, 0.61), "CONTACT")
    socket(root, "CONTACT_END", (2.5, 0, -0.61), "CONTACT")
    return {"type": "box", "size": [5.2, 1.5, 0.16]}


def build_platform(root):
    box(root, "Platform_Top", (0, 0, 0.8), (2.4, 1.6, 0.24), "wood", 0.04)
    for x in (-0.96, 0.96):
        for y in (-0.58, 0.58):
            box(root, "Platform_Leg", (x, y, 0.38), (0.14, 0.14, 0.76), "steel", 0.015, 0.6)
    socket(root, "CONTACT_TOP", (0, 0, 0.94), "CONTACT")
    return {"type": "box", "size": [2.4, 1.6, 1.0]}


def build_lever(root):
    box(root, "Lever_Beam", (0, 0, 0.52), (2.6, 0.22, 0.16), "wood", 0.035)
    cone(root, "Fulcrum", (0, 0, 0.2), 0.35, 0.03, 0.4, "orange")
    cylinder(root, "Pivot_Pin", (0, 0, 0.52), 0.1, 0.36, "steel", "Y")
    socket(root, "HINGE_AXIS", (0, 0, 0.52), "HINGE")
    socket(root, "CONTACT_LEFT", (-1.1, 0, 0.6), "CONTACT")
    socket(root, "CONTACT_RIGHT", (1.1, 0, 0.6), "CONTACT")
    return {"type": "box", "size": [2.6, 0.25, 0.55]}


def build_hinge(root):
    box(root, "Hinge_Left_Leaf", (-0.22, 0, 0.1), (0.36, 0.5, 0.08), "steel", 0.02, 0.65)
    box(root, "Hinge_Right_Leaf", (0.22, 0, 0.1), (0.36, 0.5, 0.08), "silver", 0.02, 0.65)
    cylinder(root, "Hinge_Pin", (0, 0, 0.02), 0.08, 0.62, "orange", "Y")
    socket(root, "HINGE_AXIS", (0, 0, 0.02), "HINGE")
    return {"type": "compound", "size": [0.8, 0.5, 0.5]}


def build_spring(root):
    cylinder(root, "Spring_Cap_Top", (0, 0, 0.55), 0.17, 0.08, "steel")
    cylinder(root, "Spring_Cap_Bottom", (0, 0, -0.55), 0.17, 0.08, "steel")
    helix(root, "Spring_Coil")
    socket(root, "SPRING_TOP", (0, 0, 0.59), "SPRING")
    socket(root, "SPRING_BOTTOM", (0, 0, -0.59), "SPRING")
    return {"type": "capsule", "radius": 0.16, "height": 1.1}


def build_domino(root):
    box(root, "Domino_Body", (0, 0, 0.24), (0.16, 0.09, 0.48), "orange", 0.025)
    return {"type": "box", "size": [0.16, 0.09, 0.48]}


def build_pulley(root):
    cylinder(root, "Pulley_Wheel", (0, 0, 0), 0.45, 0.16, "orange", "Y")
    torus(root, "Pulley_Groove", (0, 0, 0), 0.40, 0.035, "rubber", (math.pi / 2, 0, 0))
    cylinder(root, "Pulley_Axle", (0, 0, 0), 0.11, 0.36, "steel", "Y")
    socket(root, "SHAFT_AXIS", (0, 0, 0), "SHAFT")
    socket(root, "ROPE_GUIDE", (0.43, 0, 0), "ROPE")
    return {"type": "cylinder", "radius": 0.45, "height": 0.16}


def build_water_wheel(root):
    cylinder(root, "Wheel_Hub", (0, 0, 0), 0.18, 0.2, "steel", "Y")
    torus(root, "Wheel_Rim", (0, 0, 0), 0.67, 0.07, "wood", (math.pi / 2, 0, 0))
    for i in range(12):
        a = 2 * math.pi * i / 12
        x, z = 0.48 * math.cos(a), 0.48 * math.sin(a)
        rod_between(root, "Wheel_Spoke", (0, 0, 0), (x, 0, z), 0.035, "wood")
        box(root, "Water_Paddle", (0.72 * math.cos(a), 0, 0.72 * math.sin(a)), (0.16, 0.24, 0.26), "orange", 0.02)
    socket(root, "SHAFT_AXIS", (0, 0, 0), "SHAFT")
    return {"type": "cylinder", "radius": 0.7, "height": 0.18}


def build_bucket(root):
    bpy.ops.mesh.primitive_cone_add(vertices=40, radius1=0.39, radius2=0.29, depth=0.62, location=(0, 0, 0.38))
    body = bpy.context.object
    body.name = "Bucket_Body"
    mesh_material(body, "Bucket_Body_mat", COLORS["blue_light"], 0.05, 0.28)
    parent_asset(body, root)
    torus(root, "Bucket_Rim", (0, 0, 0.69), 0.3, 0.035, "silver")
    torus(root, "Bucket_Handle", (0, 0, 0.48), 0.38, 0.025, "steel", (math.pi / 2, 0, 0))
    socket(root, "FLUID_IN", (0, 0, 0.74), "FLUID")
    return {"type": "cylinder", "radius": 0.39, "height": 0.62}


def build_water_tank(root):
    box(root, "Tank_Base", (0, 0, 0.08), (1.05, 0.84, 0.16), "steel", 0.025, 0.55)
    for x in (-0.48, 0.48):
        box(root, "Tank_Glass_Side", (x, 0, 0.68), (0.06, 0.76, 1.1), "glass", 0.006)
    for y in (-0.38, 0.38):
        box(root, "Tank_Glass_End", (0, y, 0.68), (0.96, 0.06, 1.1), "glass", 0.006)
    box(root, "Tank_Water", (0, 0, 0.5), (0.86, 0.64, 0.55), "blue_light", 0.015)
    cylinder(root, "Tank_Inlet", (-0.58, 0, 0.9), 0.085, 0.25, "steel", "X")
    cylinder(root, "Tank_Outlet", (0.58, 0, 0.27), 0.085, 0.25, "steel", "X")
    socket(root, "FLUID_IN", (-0.7, 0, 0.9), "FLUID")
    socket(root, "FLUID_OUT", (0.7, 0, 0.27), "FLUID")
    socket(root, "PRESSURE_PORT", (0, 0, 1.28), "PRESSURE")
    return {"type": "box", "size": [1.0, 0.8, 1.2]}


def build_pipe(root):
    cylinder(root, "Pipe_Body", (0, 0, 0), 0.11, 1.0, "blue", "X")
    for x in (-0.46, 0.46):
        cylinder(root, "Pipe_Collar", (x, 0, 0), 0.15, 0.07, "silver", "X")
    socket(root, "FLUID_IN", (-0.55, 0, 0), "FLUID")
    socket(root, "FLUID_OUT", (0.55, 0, 0), "FLUID")
    return {"type": "cylinder", "radius": 0.11, "height": 1.0}


def build_valve(root):
    cylinder(root, "Valve_Pipe", (0, 0, 0), 0.11, 0.95, "blue", "X")
    sphere(root, "Valve_Body", (0, 0, 0), 0.23, "orange", (1, 1, 0.88), 0.25, 0.3)
    cylinder(root, "Valve_Stem", (0, 0, 0.34), 0.055, 0.32, "steel")
    torus(root, "Valve_Handle", (0, 0, 0.55), 0.19, 0.035, "red")
    socket(root, "FLUID_IN", (-0.58, 0, 0), "FLUID")
    socket(root, "FLUID_OUT", (0.58, 0, 0), "FLUID")
    socket(root, "INTERACTION_HANDLE", (0, 0, 0.55), "HANDLE")
    return {"type": "compound", "size": [1.2, 0.5, 0.75]}


def build_pump(root):
    box(root, "Pump_Base", (0, 0, 0.1), (0.8, 0.58, 0.18), "steel", 0.025, 0.55)
    cylinder(root, "Pump_Chamber", (0, 0, 0.48), 0.22, 0.58, "blue", "Z")
    cylinder(root, "Pump_Handle_Rod", (0, 0, 0.87), 0.045, 0.4, "silver")
    box(root, "Pump_Grip", (0, 0, 1.08), (0.42, 0.12, 0.09), "orange", 0.025)
    socket(root, "FLUID_IN", (-0.42, 0, 0.34), "FLUID")
    socket(root, "FLUID_OUT", (0.42, 0, 0.58), "FLUID")
    socket(root, "INTERACTION_HANDLE", (0, 0, 1.08), "HANDLE")
    return {"type": "box", "size": [0.8, 0.6, 1.1]}


def build_balloon(root):
    sphere(root, "Balloon_Shell", (0, 0, 0.46), 0.42, "orange", (0.88, 0.88, 1.18), 0.0, 0.28)
    cone(root, "Balloon_Neck", (0, 0, -0.04), 0.09, 0.035, 0.18, "orange")
    socket(root, "GAS_PORT", (0, 0, -0.14), "GAS")
    return {"type": "sphere", "radius": 0.42}


def build_fan(root):
    box(root, "Fan_Stand", (0, 0, 0.1), (0.18, 0.2, 0.2), "steel", 0.025, 0.55)
    cylinder(root, "Fan_Neck", (0, 0, 0.58), 0.065, 0.82, "steel")
    cylinder(root, "Fan_Rim", (0, 0, 1.08), 0.48, 0.12, "dark_teal", "Y")
    torus(root, "Fan_Grille", (0, 0, 1.08), 0.44, 0.025, "silver", (math.pi / 2, 0, 0))
    cylinder(root, "Fan_Hub", (0, 0, 1.08), 0.12, 0.17, "orange", "Y")
    for i in range(3):
        angle = 2 * math.pi * i / 3
        blade = box(root, "Fan_Blade", (0.23 * math.cos(angle), 0, 1.08 + 0.23 * math.sin(angle)), (0.38, 0.07, 0.12), "blue_light", 0.035)
        blade.rotation_euler[1] = -angle
    socket(root, "ELECTRICAL_IN", (0, -0.24, 0.12), "ELECTRICAL")
    socket(root, "AIR_OUT", (0, -0.55, 1.08), "AIR")
    socket(root, "SHAFT_AXIS", (0, -0.12, 1.08), "SHAFT")
    return {"type": "box", "size": [0.9, 0.4, 1.25]}


def build_battery(root):
    box(root, "Battery_Case", (0, 0, 0.36), (0.5, 0.32, 0.72), "dark_teal", 0.055)
    cylinder(root, "Positive_Terminal", (-0.14, 0, 0.78), 0.065, 0.08, "red")
    cylinder(root, "Negative_Terminal", (0.14, 0, 0.78), 0.065, 0.08, "black")
    box(root, "Battery_Label", (0, -0.165, 0.39), (0.28, 0.012, 0.22), "white", 0.006)
    socket(root, "ELECTRICAL_POSITIVE", (-0.14, 0, 0.83), "ELECTRICAL")
    socket(root, "ELECTRICAL_NEGATIVE", (0.14, 0, 0.83), "ELECTRICAL")
    return {"type": "box", "size": [0.5, 0.32, 0.8]}


def build_switch(root):
    box(root, "Switch_Base", (0, 0, 0.12), (0.62, 0.42, 0.24), "dark_teal", 0.04)
    cylinder(root, "Switch_Pivot", (0, 0, 0.29), 0.075, 0.46, "steel", "Y")
    rod_between(root, "Switch_Lever", (-0.18, 0, 0.35), (0.19, 0, 0.62), 0.045, "orange")
    sphere(root, "Switch_Knob", (0.19, 0, 0.62), 0.09, "red")
    socket(root, "WIRE_IN", (-0.34, 0, 0.08), "ELECTRICAL")
    socket(root, "WIRE_OUT", (0.34, 0, 0.08), "ELECTRICAL")
    socket(root, "INTERACTION_HANDLE", (0.19, 0, 0.62), "HANDLE")
    return {"type": "box", "size": [0.62, 0.42, 0.75]}


def build_lamp(root):
    cylinder(root, "Lamp_Base", (0, 0, 0.08), 0.2, 0.16, "steel")
    cylinder(root, "Lamp_Stem", (0, 0, 0.31), 0.055, 0.36, "silver")
    sphere(root, "Lamp_Bulb", (0, 0, 0.6), 0.19, "yellow", None, 0.0, 0.22)
    socket(root, "WIRE_IN", (-0.12, 0, 0.02), "ELECTRICAL")
    socket(root, "WIRE_OUT", (0.12, 0, 0.02), "ELECTRICAL")
    return {"type": "cylinder", "radius": 0.24, "height": 0.72}


def build_led(root):
    cylinder(root, "LED_Stem", (0, 0, 0.07), 0.12, 0.14, "green")
    sphere(root, "LED_Dome", (0, 0, 0.17), 0.11, "green", (1, 1, 0.72), 0.0, 0.18)
    rod_between(root, "LED_Lead_A", (-0.045, 0, 0), (-0.045, 0, -0.18), 0.012, "silver")
    rod_between(root, "LED_Lead_K", (0.045, 0, 0), (0.045, 0, -0.18), 0.012, "silver")
    socket(root, "WIRE_IN", (-0.045, 0, -0.2), "ELECTRICAL")
    socket(root, "WIRE_OUT", (0.045, 0, -0.2), "ELECTRICAL")
    return {"type": "cylinder", "radius": 0.12, "height": 0.38}


def build_resistor(root):
    cylinder(root, "Resistor_Core", (0, 0, 0), 0.09, 0.42, "wood", "X")
    for x in (-0.34, 0.34):
        rod_between(root, "Resistor_Lead", (x, 0, 0), (x * 0.55, 0, 0), 0.018, "silver")
    for x in (-0.09, 0.03, 0.13):
        box(root, "Resistor_Band", (x, -0.092, 0), (0.035, 0.012, 0.16), "red", 0)
    socket(root, "WIRE_IN", (-0.42, 0, 0), "ELECTRICAL")
    socket(root, "WIRE_OUT", (0.42, 0, 0), "ELECTRICAL")
    return {"type": "cylinder", "radius": 0.09, "height": 0.42}


def build_motor(root, generator=False):
    casing = "Generator_Casing" if generator else "Motor_Casing"
    cylinder(root, casing, (0, 0, 0.34), 0.29 if not generator else 0.34, 0.58 if not generator else 0.7, "steel", "Z")
    for z in (0.17, 0.51):
        torus(root, "Motor_Rib", (0, 0, z), 0.27 if not generator else 0.32, 0.025, "dark_teal", (0, 0, 0))
    cylinder(root, "Motor_Shaft", (0, 0, 0.74), 0.065, 0.32, "silver")
    box(root, "Motor_Foot", (0, 0, 0.06), (0.56, 0.44, 0.12), "dark_teal", 0.02, 0.6)
    socket(root, "SHAFT_AXIS", (0, 0, 0.92), "SHAFT")
    if generator:
        socket(root, "ELECTRICAL_POSITIVE", (-0.12, 0, 0.1), "ELECTRICAL")
        socket(root, "ELECTRICAL_NEGATIVE", (0.12, 0, 0.1), "ELECTRICAL")
        return {"type": "cylinder", "radius": 0.34, "height": 0.7}
    socket(root, "ELECTRICAL_IN", (-0.14, 0, 0.12), "ELECTRICAL")
    socket(root, "ELECTRICAL_OUT", (0.14, 0, 0.12), "ELECTRICAL")
    return {"type": "cylinder", "radius": 0.3, "height": 0.58}


def build_burner(root):
    cylinder(root, "Burner_Base", (0, 0, 0.1), 0.44, 0.2, "dark_teal")
    torus(root, "Burner_Ring", (0, 0, 0.24), 0.28, 0.055, "steel")
    for i in range(6):
        angle = math.tau * i / 6
        cone(root, "Flame_Visual", (0.25 * math.cos(angle), 0.25 * math.sin(angle), 0.48), 0.065, 0.015, 0.38, "blue_light", 16)
    socket(root, "THERMAL_OUT", (0, 0, 0.73), "THERMAL")
    socket(root, "GAS_IN", (0.45, 0, 0.08), "GAS")
    return {"type": "cylinder", "radius": 0.44, "height": 0.42}


def build_pressure_gauge(root):
    cylinder(root, "Gauge_Case", (0, 0, 0), 0.38, 0.16, "steel", "Y")
    cylinder(root, "Gauge_Face", (0, -0.09, 0), 0.32, 0.025, "white", "Y", 48, 0.05)
    torus(root, "Gauge_Bezel", (0, -0.1, 0), 0.34, 0.035, "silver", (math.pi / 2, 0, 0))
    rod_between(root, "Gauge_Needle", (0, -0.12, 0), (0.19, -0.12, 0.1), 0.018, "red")
    socket(root, "PRESSURE_PORT", (0, 0.12, -0.28), "PRESSURE")
    return {"type": "cylinder", "radius": 0.38, "height": 0.16}


def build_thermometer(root):
    box(root, "Thermometer_Body", (0, 0, 0.45), (0.12, 0.12, 0.9), "white", 0.055)
    box(root, "Thermometer_Column", (0, -0.065, 0.46), (0.025, 0.012, 0.58), "red", 0.01)
    sphere(root, "Thermometer_Bulb", (0, 0, 0.04), 0.09, "red")
    socket(root, "TEMPERATURE_PROBE", (0, 0, 0), "THERMAL")
    return {"type": "box", "size": [0.12, 0.12, 0.9]}


def build_sensor(root):
    box(root, "Sensor_Case", (0, 0, 0.15), (0.38, 0.3, 0.22), "dark_teal", 0.035)
    sphere(root, "Sensor_Lens", (0, -0.16, 0.18), 0.07, "orange", None, 0.0, 0.2)
    socket(root, "SENSOR_INPUT", (0, 0, 0.28), "SENSOR")
    socket(root, "LOGIC_OUT", (0.25, 0, 0.08), "LOGIC")
    return {"type": "box", "size": [0.38, 0.3, 0.22]}


BUILDERS = {
    "ball": build_ball, "cube": build_cube, "weight": build_weight, "ramp": build_ramp,
    "platform": build_platform, "lever": build_lever, "hinge": build_hinge,
    "spring": build_spring, "domino": build_domino, "pulley": build_pulley,
    "water_wheel": build_water_wheel, "bucket": build_bucket, "water_tank": build_water_tank,
    "pipe": build_pipe, "valve": build_valve, "pump": build_pump, "balloon": build_balloon,
    "fan": build_fan, "battery": build_battery, "switch": build_switch, "lamp": build_lamp,
    "led": build_led, "resistor": build_resistor, "motor": build_motor,
    "generator": lambda root: build_motor(root, generator=True), "burner": build_burner,
    "pressure_gauge": build_pressure_gauge, "thermometer": build_thermometer, "sensor": build_sensor,
}


def parse_args():
    raw = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description="Generate PhysicsLab Blender source and GLB assets.")
    parser.add_argument("--root", type=Path, nargs="?", const=Path.cwd(), default=Path.cwd(), help="PhysicsLab repository root; defaults to the current directory.")
    parser.add_argument("--only", default="", help="Comma-separated asset IDs to generate; default is all.")
    parser.add_argument("--no-blend", action="store_true", help="Skip saving editable .blend source files.")
    args = parser.parse_args(raw)
    args.root = args.root.resolve()
    return args


def export_asset(asset_id, spec, args):
    clear_scene()
    root = make_root(asset_id)
    collider = BUILDERS[spec["builder"]](root)
    root["physicslab_sockets"] = json.dumps(spec["sockets"])
    for marker_name in spec["sockets"]:
        if not bpy.data.objects.get(marker_name):
            raise RuntimeError("Asset " + asset_id + " is missing required socket " + marker_name)

    # Apply mesh transforms so exported dimensions and socket coordinates use predictable meters.
    bpy.ops.object.select_all(action="DESELECT")
    for obj in list(root.children):
        if obj.type == "MESH":
            obj.select_set(True)
            bpy.context.view_layer.objects.active = obj
            bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    root.select_set(True)

    glb_dir = args.root / "public" / "assets" / "models"
    source_dir = args.root / "assets" / "blender-source"
    glb_dir.mkdir(parents=True, exist_ok=True)
    source_dir.mkdir(parents=True, exist_ok=True)
    glb_path = glb_dir / (asset_id + ".glb")
    blend_path = source_dir / (asset_id + ".blend")

    if not args.no_blend:
        bpy.ops.wm.save_as_mainfile(filepath=str(blend_path), check_existing=False)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in list(root.children):
        obj.select_set(True)
    root.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(
        filepath=str(glb_path),
        check_existing=False,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_animations=False,
        export_cameras=False,
        export_lights=False,
        export_extras=True,
    )
    return {
        "id": asset_id,
        "model": "assets/models/" + asset_id + ".glb",
        "source": None if args.no_blend else "assets/blender-source/" + asset_id + ".blend",
        "collider": collider,
        "sockets": spec["sockets"],
        "units": "meters",
    }


def main():
    args = parse_args()
    selected = [item.strip() for item in args.only.split(",") if item.strip()] if args.only else list(ASSETS)
    unknown = sorted(set(selected) - set(ASSETS))
    if unknown:
        raise SystemExit("Unknown asset IDs: " + ", ".join(unknown))
    manifest = {"schemaVersion": 1, "coordinateSystem": "Y-up glTF, meter units", "assets": []}
    for asset_id in selected:
        print("[PhysicsLab] Generating " + asset_id)
        manifest["assets"].append(export_asset(asset_id, ASSETS[asset_id], args))
    manifest_dir = args.root / "public" / "assets"
    manifest_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = manifest_dir / "asset-manifest.json"
    if args.only:
        # Preserve existing manifest entries when generating a subset.
        if manifest_path.exists():
            existing = json.loads(manifest_path.read_text(encoding="utf-8"))
            by_id = {entry["id"]: entry for entry in existing.get("assets", [])}
            by_id.update({entry["id"]: entry for entry in manifest["assets"]})
            manifest["assets"] = [by_id[key] for key in sorted(by_id)]
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print("[PhysicsLab] Wrote " + str(manifest_path))
    print("[PhysicsLab] Generated " + str(len(selected)) + " GLB model(s).")


if __name__ == "__main__":
    main()
