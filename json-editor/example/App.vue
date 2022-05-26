<template>
  <div class="example-json">
    <!-- <vue-json-editor v-model="json" 
      :show-btns="true" 
      :mode="'code'" 
      lang="zh"
      @json-change="onJsonChange" 
      @json-save="onJsonSave" 
      @has-error="onError">   
    </vue-json-editor> -->
    <vue-json-editor
      v-model="json"
      :showBtns="true"
      lang="zh"
      :mode="'code'"
      style="height: 640px"
      @json-change="onJsonChange"
      @json-save="onJsonSave"
      @has-error="onError"
    />
    <span class="baseurl">{{this.baseUrl}}</span>
  </div>
</template>

<script>
import vueJsonEditor from "../vue-json-editor.vue";
export default {
  data() {
    return {
      json: [],
      baseUrl:'http://localhost:9000/mock'
    };
  },

  components: {
    vueJsonEditor,
  },

  created() {
    // 初始化列表数据
    console.log("created");
    this.baseUrl=window.origin + '/mock'
    this.resetJson();
  },

  methods: {
    onJsonChange(value) {
      console.log("value:", value);
    },

    onJsonSave(value) {
      console.log("value:", value);
      let data =
        value.length == 0 ? JSON.stringify(this.json) : JSON.stringify(value);
      this.$http({
        url: "/manage/save",
        method: "post",
        data: data,
      })
        .then((res) => {
          console.log(res);
          this.resetJson();
          this.$message({
            message: "保存成功",
            type: "success",
            duration: 1500,
            onClose: () => {
              this.visible = false;
              this.$emit("refreshDataList");
            },
          });
        })
        .catch((err) => {
          console.log(err);
          this.$message.error("保存错误");
        });
    },

    onError(value) {
      this.$message.error("json格式错误");
      console.log("value:", value);
    },

    resetJson() {
      this.$http
        .get("/manage/json")
        .then((res) => {
          this.json = res.data;
        })
        .catch((err) => {
          console.log(err);
        });
    },
  },
};
</script>
<style>
.jsoneditor-vue {
  height: 100%;
}
.jsoneditor-poweredBy {
  display: none;
}
.baseurl {
  position: absolute;
  right: 10px;
}
</style>
